import jwt from "jsonwebtoken";
import process from "node:process";
import { prisma } from "../lib/prisma.js";
import { SESSION_COOKIE_NAME } from "../lib/session.js";

function extractToken(req) {
  return req.cookies?.[SESSION_COOKIE_NAME] ?? null;
}

export async function authenticate(req, res, next) {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ error: "Not authenticated" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: payload.id }, select: { sessionVersion: true } });
    if (!user || user.sessionVersion !== (payload.sessionVersion ?? 0)) {
      return res.status(401).json({ error: "Session is no longer valid" });
    }
    req.sessionToken = token;
    req.user = { id: payload.id, email: payload.email, username: payload.username, name: payload.name };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export async function optionalAuthenticate(req, _res, next) {
  const token = extractToken(req);
  if (token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const user = await prisma.user.findUnique({ where: { id: payload.id }, select: { sessionVersion: true } });
      if (user && user.sessionVersion === (payload.sessionVersion ?? 0)) {
        req.user = { id: payload.id, email: payload.email, username: payload.username, name: payload.name };
      }
    } catch { /* ignore */ }
  }
  next();
}

export async function requireAdmin(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { isAdmin: true },
    });
    if (!user?.isAdmin) return res.status(403).json({ error: "Administrator access required" });
    next();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to verify administrator access" });
  }
}
