import { describe, expect, it, vi } from "vitest";
import { createRateLimit } from "../middleware/rateLimit.js";

function response() {
  return {
    headers: {},
    statusCode: 200,
    body: null,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

describe("createRateLimit", () => {
  it("returns 429 after the configured number of requests", () => {
    const limit = createRateLimit({ windowMs: 60_000, max: 2, message: "Slow down" });
    const req = { ip: "127.0.0.1" };
    const next = vi.fn();

    limit(req, response(), next);
    limit(req, response(), next);
    const blocked = response();
    limit(req, blocked, next);

    expect(next).toHaveBeenCalledTimes(2);
    expect(blocked.statusCode).toBe(429);
    expect(blocked.body).toEqual({ error: "Slow down" });
    expect(blocked.headers["Retry-After"]).toBeDefined();
  });

  it("uses the authenticated user id instead of their IP", () => {
    const limit = createRateLimit({ windowMs: 60_000, max: 1, message: "Slow down" });
    const next = vi.fn();

    limit({ ip: "10.0.0.1", user: { id: 7 } }, response(), next);
    const blocked = response();
    limit({ ip: "10.0.0.2", user: { id: 7 } }, blocked, next);

    expect(blocked.statusCode).toBe(429);
  });
});
