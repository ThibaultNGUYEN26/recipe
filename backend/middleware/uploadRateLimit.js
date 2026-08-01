const attempts = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_UPLOADS = 10;

export function uploadRateLimit(req, res, next) {
  const now = Date.now();
  const key = `${req.ip}:${req.user?.id ?? "anonymous"}`;
  const recent = (attempts.get(key) || []).filter((time) => now - time < WINDOW_MS);
  if (recent.length >= MAX_UPLOADS) {
    res.setHeader("Retry-After", String(Math.ceil((WINDOW_MS - (now - recent[0])) / 1000)));
    return res.status(429).json({ error: "Too many media uploads. Please try again later." });
  }
  recent.push(now);
  attempts.set(key, recent);
  next();
}

export function clearUploadRateLimitsForTests() {
  attempts.clear();
}
