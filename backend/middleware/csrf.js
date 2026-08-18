import { createHmac, timingSafeEqual } from "node:crypto";
import process from "node:process";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const SESSION_ENDPOINTS = new Set([
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/google",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/verify-email",
]);

export function csrfTokenForSession(sessionToken) {
  return createHmac("sha256", process.env.JWT_SECRET)
    .update(`csrf:${sessionToken}`)
    .digest("base64url");
}

export function csrfProtection(req, res, next) {
  if (SAFE_METHODS.has(req.method) || SESSION_ENDPOINTS.has(req.path)) return next();

  const sessionToken = req.cookies?.token;
  if (!sessionToken) return next();

  const provided = req.get("X-CSRF-Token");
  const expected = csrfTokenForSession(sessionToken);
  if (!provided) return res.status(403).json({ error: "Missing CSRF token" });

  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  if (providedBuffer.length !== expectedBuffer.length || !timingSafeEqual(providedBuffer, expectedBuffer)) {
    return res.status(403).json({ error: "Invalid CSRF token" });
  }
  next();
}
