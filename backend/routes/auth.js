import { Router } from "express";
import process from "node:process";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/authenticate.js";
import { DEFAULT_AVATAR_URL } from "../lib/media/config.js";
import { usernameSuggestionCandidates, validateUsername } from "../lib/username.js";
import { buildLoginLookup } from "../lib/login.js";

const router = Router();

const isProd = process.env.NODE_ENV === "production";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

async function availableUsernameSuggestions(username) {
  const candidates = usernameSuggestionCandidates(username);
  const used = await prisma.user.findMany({
    where: { username: { in: candidates } },
    select: { username: true },
  });
  const usedNames = new Set(used.map((user) => user.username));
  return candidates.filter((candidate) => !usedNames.has(candidate)).slice(0, 3);
}

router.post("/register", async (req, res) => {
  const { email, password, name } = req.body;
  const { username, error: usernameError } = validateUsername(req.body.username);
  if (!email || !password) return res.status(400).json({ error: "Email and password are required" });
  if (usernameError) return res.status(400).json({ error: usernameError, code: "INVALID_USERNAME" });
  if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });

  try {
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
      select: { email: true, username: true },
    });
    if (existing?.email === email) return res.status(409).json({ error: "Email already in use", code: "EMAIL_TAKEN" });
    if (existing?.username === username) {
      const suggestions = await availableUsernameSuggestions(username);
      return res.status(409).json({ error: "Username already taken", code: "USERNAME_TAKEN", suggestions });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({ data: { email, username, passwordHash, name: name?.trim() || null } });

    const token = jwt.sign({ id: user.id, email: user.email, username: user.username, name: user.name }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.cookie("token", token, COOKIE_OPTIONS);
    res.status(201).json({ token, user: { id: user.id, email: user.email, username: user.username, name: user.name, isAdmin: user.isAdmin, isVerified: user.isVerified, avatarUrl: user.avatarUrl || DEFAULT_AVATAR_URL, avatarPending: false, preferredLanguage: user.preferredLanguage } });
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

router.get("/username-availability", async (req, res) => {
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

router.post("/login", async (req, res) => {
  const { password } = req.body;
  const identifier = req.body.identifier ?? req.body.email;
  const loginLookup = buildLoginLookup(identifier);
  if (!loginLookup || !password) {
    return res.status(400).json({ error: "Username or email and password are required" });
  }

  try {
    const user = await prisma.user.findFirst({ where: loginLookup });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: "Invalid username, email, or password" });
    }

    const token = jwt.sign({ id: user.id, email: user.email, username: user.username, name: user.name }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.cookie("token", token, COOKIE_OPTIONS);
    res.json({ token, user: { id: user.id, email: user.email, username: user.username, name: user.name, isAdmin: user.isAdmin, isVerified: user.isVerified, avatarUrl: user.avatarUrl || DEFAULT_AVATAR_URL, avatarPending: Boolean(user.pendingAvatarId), preferredLanguage: user.preferredLanguage } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Login failed" });
  }
});

router.post("/logout", (_req, res) => {
  res.clearCookie("token", COOKIE_OPTIONS);
  res.json({ ok: true });
});

router.get("/me", authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, email: true, username: true, name: true, isAdmin: true, isVerified: true, avatarUrl: true, pendingAvatarId: true, preferredLanguage: true },
  });
  if (!user) return res.status(401).json({ error: "User no longer exists" });
  const { pendingAvatarId, ...publicUser } = user;
  res.json({ user: { ...publicUser, avatarUrl: user.avatarUrl || DEFAULT_AVATAR_URL, avatarPending: Boolean(pendingAvatarId) } });
});

export default router;
