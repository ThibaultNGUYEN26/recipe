function clientKey(req) {
  return req.user?.id ? `user:${req.user.id}` : `ip:${req.ip}`;
}

export function createRateLimit({ windowMs, max, message, key = clientKey }) {
  const buckets = new Map();
  let requestsSinceCleanup = 0;

  function cleanup(now) {
    requestsSinceCleanup += 1;
    if (requestsSinceCleanup < 500) return;
    requestsSinceCleanup = 0;
    for (const [bucketKey, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(bucketKey);
    }
  }

  const middleware = (req, res, next) => {
    const now = Date.now();
    cleanup(now);

    const bucketKey = key(req);
    let bucket = buckets.get(bucketKey);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(bucketKey, bucket);
    }

    const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    res.setHeader("RateLimit-Limit", String(max));
    res.setHeader("RateLimit-Remaining", String(Math.max(0, max - bucket.count - 1)));
    res.setHeader("RateLimit-Reset", String(retryAfter));

    if (bucket.count >= max) {
      res.setHeader("Retry-After", String(retryAfter));
      return res.status(429).json({ error: message });
    }

    bucket.count += 1;
    next();
  };

  middleware.clear = () => buckets.clear();
  return middleware;
}

export const loginRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many sign-in attempts. Please try again in 15 minutes.",
});

export const registrationRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: "Too many accounts created from this connection. Please try again later.",
});

export const usernameCheckRateLimit = createRateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: "Too many username checks. Please wait a moment.",
});

export const accountEmailRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many email requests. Please try again later.",
});

export const commentRateLimit = createRateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: "You are commenting too quickly. Please wait a moment.",
});

export const followRateLimit = createRateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: "Too many follow changes. Please wait a moment.",
});

export const likeRateLimit = createRateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: "Too many like changes. Please wait a moment.",
});

export const safetyRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: "Too many safety requests. Please try again later.",
});
