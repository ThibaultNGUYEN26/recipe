import process from "node:process";

export const SESSION_COOKIE_NAME = "token";

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_SESSION_DAYS = 7;

function sessionDays() {
  const configured = Number(process.env.SESSION_TTL_DAYS);
  return Number.isFinite(configured) && configured > 0
    ? Math.min(configured, 365)
    : DEFAULT_SESSION_DAYS;
}

function sameSitePolicy() {
  const configured = process.env.COOKIE_SAME_SITE?.trim().toLowerCase();
  if (["lax", "strict", "none"].includes(configured)) return configured;
  return process.env.NODE_ENV === "production" ? "none" : "lax";
}

export function isCrossOriginSessionRequest(req) {
  if (process.env.NODE_ENV !== "production") return false;
  const origin = req?.get?.("origin") || req?.headers?.origin;
  const forwardedHost = req?.get?.("x-forwarded-host") || req?.get?.("host") || req?.headers?.["x-forwarded-host"] || req?.headers?.host;
  if (!origin || !forwardedHost) return false;
  try {
    const originHost = new URL(origin).host.toLowerCase();
    const requestHost = String(forwardedHost).split(",")[0].trim().toLowerCase();
    return originHost !== requestHost;
  } catch {
    return false;
  }
}

export function sessionCookieOptions({ persistent = true, crossOrigin = false } = {}) {
  const sameSite = crossOrigin ? "none" : sameSitePolicy();
  const secure = process.env.NODE_ENV === "production" || sameSite === "none";
  const partitioned = sameSite === "none" && (crossOrigin || process.env.COOKIE_PARTITIONED !== "false");

  return {
    httpOnly: true,
    secure,
    sameSite,
    path: "/",
    ...(partitioned && { partitioned: true }),
    ...(persistent && { maxAge: sessionDays() * DAY_MS }),
  };
}

export function sessionJwtOptions() {
  return { expiresIn: Math.floor(sessionDays() * 24 * 60 * 60) };
}

export function setSessionCookie(res, token, req) {
  res.cookie(SESSION_COOKIE_NAME, token, sessionCookieOptions({ crossOrigin: isCrossOriginSessionRequest(req) }));
}

export function clearSessionCookie(res, req) {
  res.clearCookie(SESSION_COOKIE_NAME, sessionCookieOptions({ persistent: false, crossOrigin: isCrossOriginSessionRequest(req) }));
}
