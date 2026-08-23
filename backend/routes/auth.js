import { Router } from "express";
import process from "node:process";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/authenticate.js";
import { DEFAULT_AVATAR_URL } from "../lib/media/config.js";
import { usernameSuggestionCandidates, validateUsername } from "../lib/username.js";
import { buildLoginLookup } from "../lib/login.js";
import { verifyGoogleCredential } from "../lib/googleAuth.js";
import { csrfTokenForSession } from "../middleware/csrf.js";
import { loginRateLimit, registrationRateLimit, usernameCheckRateLimit } from "../middleware/rateLimit.js";
import { accountEmailRateLimit } from "../middleware/rateLimit.js";
import { hashAccountToken, newAccountToken } from "../lib/accountTokens.js";
import { sendPasswordResetEmail, sendVerificationEmail } from "../lib/email.js";
import { clearSessionCookie, sessionJwtOptions, setSessionCookie } from "../lib/session.js";

const router = Router();

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    name: user.name,
    isAdmin: user.isAdmin,
    isVerified: user.isVerified,
    avatarUrl: user.avatarUrl || DEFAULT_AVATAR_URL,
    avatarPending: Boolean(user.pendingAvatarId),
    preferredLanguage: user.preferredLanguage,
    emailVerified: Boolean(user.emailVerifiedAt),
  };
}

function createSession(req, res, user, status = 200) {
  const token = jwt.sign(
    { id: user.id, email: user.email, username: user.username, name: user.name, sessionVersion: user.sessionVersion },
    process.env.JWT_SECRET,
    sessionJwtOptions(),
  );
  setSessionCookie(res, token, req);
  return res.status(status).json({ csrfToken: csrfTokenForSession(token), user: publicUser(user) });
}

async function googleUsername(email) {
  let base = email.split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9._]+/g, ".")
    .replace(/^[._]+|[._]+$/g, "")
    .slice(0, 30);
  if (base.length < 3) base = `user.${base || "google"}`.slice(0, 30);

  const candidates = [base];
  for (let suffix = 2; suffix <= 100; suffix += 1) {
    const ending = `.${suffix}`;
    candidates.push(`${base.slice(0, 30 - ending.length)}${ending}`);
  }
  const used = await prisma.user.findMany({
    where: { username: { in: candidates } },
    select: { username: true },
  });
  const usedNames = new Set(used.map((user) => user.username));
  return candidates.find((candidate) => !usedNames.has(candidate))
    ?? `google.${Date.now().toString(36)}`.slice(0, 30);
}

async function availableUsernameSuggestions(username) {
  const candidates = usernameSuggestionCandidates(username);
  const used = await prisma.user.findMany({
    where: { username: { in: candidates } },
    select: { username: true },
  });
  const usedNames = new Set(used.map((user) => user.username));
  return candidates.filter((candidate) => !usedNames.has(candidate)).slice(0, 3);
}

router.post("/register", registrationRateLimit, async (req, res) => {
  const { email, password, name } = req.body;
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  const { username, error: usernameError } = validateUsername(req.body.username);
  if (!normalizedEmail || !password) return res.status(400).json({ error: "Email and password are required" });
  if (usernameError) return res.status(400).json({ error: usernameError, code: "INVALID_USERNAME" });
  if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });

  try {
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: { equals: normalizedEmail, mode: "insensitive" } }, { username }] },
      select: { email: true, username: true },
    });
    if (existing?.email?.toLowerCase() === normalizedEmail) return res.status(409).json({ error: "Email already in use", code: "EMAIL_TAKEN" });
    if (existing?.username === username) {
      const suggestions = await availableUsernameSuggestions(username);
      return res.status(409).json({ error: "Username already taken", code: "USERNAME_TAKEN", suggestions });
    }

    const verificationToken = newAccountToken();
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: { email: normalizedEmail, username, passwordHash, name: name?.trim() || null },
      });
      await tx.emailVerificationToken.create({
        data: { userId: createdUser.id, tokenHash: hashAccountToken(verificationToken), expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
      });
      return createdUser;
    });
    sendVerificationEmail(user.email, verificationToken).catch((error) => console.error("Verification email failed", error));

    return createSession(req, res, user, 201);
  } catch (err) {
    if (err.code === "P2002") {
      const target = Array.isArray(err.meta?.target) ? err.meta.target.join(" ") : String(err.meta?.target ?? "");
      const usernameTaken = target.includes("username");
      const suggestions = usernameTaken ? await availableUsernameSuggestions(username) : undefined;
      return res.status(409).json({
        error: usernameTaken ? "Username already taken" : "Email already in use",
        code: usernameTaken ? "USERNAME_TAKEN" : "EMAIL_TAKEN",
        ...(suggestions && { suggestions }),
      });
    }
    console.error(err);
    res.status(500).json({ error: err.message || "Registration failed" });
  }
});

router.get("/username-availability", usernameCheckRateLimit, async (req, res) => {
  const { username, error } = validateUsername(req.query.username);
  if (error) return res.status(400).json({ available: false, username, error });

  try {
    const candidates = usernameSuggestionCandidates(username);
    const used = await prisma.user.findMany({
      where: { username: { in: [username, ...candidates] } },
      select: { username: true },
    });
    const usedNames = new Set(used.map((user) => user.username));
    const available = !usedNames.has(username);
    const suggestions = available
      ? []
      : candidates.filter((candidate) => !usedNames.has(candidate)).slice(0, 3);
    res.json({ available, username, suggestions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to check username availability" });
  }
});

router.post("/login", loginRateLimit, async (req, res) => {
  const { password } = req.body;
  const identifier = req.body.identifier ?? req.body.email;
  const loginLookup = buildLoginLookup(identifier);
  if (!loginLookup || !password) {
    return res.status(400).json({ error: "Username or email and password are required" });
  }

  try {
    const user = await prisma.user.findFirst({ where: loginLookup });
    if (!user || !user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: "Invalid username, email, or password" });
    }

    return createSession(req, res, user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Login failed" });
  }
});

router.post("/google", loginRateLimit, async (req, res) => {
  try {
    const identity = await verifyGoogleCredential(req.body.credential, process.env.GOOGLE_CLIENT_ID);
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { googleId: identity.subject },
          { email: { equals: identity.email, mode: "insensitive" } },
        ],
      },
    });

    if (user?.googleId && user.googleId !== identity.subject) {
      return res.status(409).json({ error: "This email is already linked to another Google account" });
    }

    if (user) {
      if (!user.googleId || !user.emailVerifiedAt) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { googleId: identity.subject, name: user.name || identity.name || null, emailVerifiedAt: new Date() },
        });
      }
    } else {
      user = await prisma.user.create({
        data: {
          email: identity.email,
          googleId: identity.subject,
          username: await googleUsername(identity.email),
          name: identity.name || null,
          emailVerifiedAt: new Date(),
        },
      });
    }

    return createSession(req, res, user);
  } catch (err) {
    console.error("Google authentication failed", err);
    const configurationError = err.message === "Google authentication is not configured";
    return res.status(configurationError ? 503 : 401).json({
      error: configurationError ? err.message : "Google sign-in failed",
    });
  }
});

router.post("/logout", (req, res) => {
  clearSessionCookie(res, req);
  res.json({ ok: true });
});

router.post("/forgot-password", accountEmailRateLimit, async (req, res) => {
  const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const generic = { message: "If an account exists for that email, a reset link has been sent." };
  if (!email) return res.json(generic);
  try {
    const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } }, select: { id: true, email: true, passwordHash: true } });
    if (user?.passwordHash) {
      const token = newAccountToken();
      await prisma.$transaction([
        prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
        prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash: hashAccountToken(token), expiresAt: new Date(Date.now() + 60 * 60 * 1000) } }),
      ]);
      await sendPasswordResetEmail(user.email, token);
    }
  } catch (error) {
    console.error("Password reset request failed", error);
  }
  res.json(generic);
});

router.post("/reset-password", accountEmailRateLimit, async (req, res) => {
  const token = typeof req.body.token === "string" ? req.body.token : "";
  const password = typeof req.body.password === "string" ? req.body.password : "";
  if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });
  const record = token ? await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashAccountToken(token) } }) : null;
  if (!record || record.expiresAt <= new Date()) return res.status(400).json({ error: "This reset link is invalid or has expired" });
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash, sessionVersion: { increment: 1 } } }),
    prisma.passwordResetToken.deleteMany({ where: { userId: record.userId } }),
  ]);
  clearSessionCookie(res, req);
  res.json({ ok: true });
});

router.post("/send-verification", authenticate, accountEmailRateLimit, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { id: true, email: true, emailVerifiedAt: true } });
    if (!user) return res.status(401).json({ error: "User no longer exists" });
    if (user.emailVerifiedAt) return res.json({ ok: true, alreadyVerified: true });
    const token = newAccountToken();
    await prisma.$transaction([
      prisma.emailVerificationToken.deleteMany({ where: { userId: user.id } }),
      prisma.emailVerificationToken.create({ data: { userId: user.id, tokenHash: hashAccountToken(token), expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) } }),
    ]);
    await sendVerificationEmail(user.email, token);
    res.json({ ok: true });
  } catch (error) {
    console.error("Verification email failed", error);
    res.status(503).json({ error: "Could not send the verification email" });
  }
});

router.post("/verify-email", accountEmailRateLimit, async (req, res) => {
  const token = typeof req.body.token === "string" ? req.body.token : "";
  const record = token ? await prisma.emailVerificationToken.findUnique({ where: { tokenHash: hashAccountToken(token) } }) : null;
  if (!record || record.expiresAt <= new Date()) return res.status(400).json({ error: "This verification link is invalid or has expired" });
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } }),
    prisma.emailVerificationToken.deleteMany({ where: { userId: record.userId } }),
  ]);
  res.json({ ok: true });
});

router.get("/me", authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, email: true, username: true, name: true, isAdmin: true, isVerified: true, emailVerifiedAt: true, avatarUrl: true, pendingAvatarId: true, preferredLanguage: true, sessionVersion: true },
  });
  if (!user) return res.status(401).json({ error: "User no longer exists" });
  // Keep the current cookie stable. Rotating it here can race with focus or
  // multi-tab session checks and leave the client holding a CSRF token for a
  // JWT that has already been replaced by another request.
  return res.json({ csrfToken: csrfTokenForSession(req.sessionToken), user: publicUser(user) });
});

export default router;
