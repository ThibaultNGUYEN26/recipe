import { afterEach, describe, expect, it, vi } from "vitest";
import process from "node:process";
import {
  clearSessionCookie,
  isCrossOriginSessionRequest,
  sessionCookieOptions,
  sessionJwtOptions,
  setSessionCookie,
} from "../lib/session.js";

const originalEnv = {
  NODE_ENV: process.env.NODE_ENV,
  COOKIE_SAME_SITE: process.env.COOKIE_SAME_SITE,
  COOKIE_PARTITIONED: process.env.COOKIE_PARTITIONED,
  SESSION_TTL_DAYS: process.env.SESSION_TTL_DAYS,
};

afterEach(() => {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("session cookies", () => {
  it("uses a secure partitioned cookie for cross-site production deployments", () => {
    process.env.NODE_ENV = "production";
    delete process.env.COOKIE_SAME_SITE;
    delete process.env.COOKIE_PARTITIONED;

    expect(sessionCookieOptions()).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: "none",
      partitioned: true,
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  });

  it("supports the recommended same-site deployment without partitioning", () => {
    process.env.NODE_ENV = "production";
    process.env.COOKIE_SAME_SITE = "lax";
    process.env.COOKIE_PARTITIONED = "false";

    expect(sessionCookieOptions()).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  });

  it("keeps JWT and cookie lifetimes aligned", () => {
    process.env.SESSION_TTL_DAYS = "30";

    expect(sessionCookieOptions().maxAge).toBe(30 * 24 * 60 * 60 * 1000);
    expect(sessionJwtOptions().expiresIn).toBe(30 * 24 * 60 * 60);
  });

  it("uses identical cookie scope when setting and clearing", () => {
    process.env.NODE_ENV = "production";
    process.env.COOKIE_SAME_SITE = "lax";
    const res = { cookie: vi.fn(), clearCookie: vi.fn() };

    setSessionCookie(res, "signed-token");
    clearSessionCookie(res);

    expect(res.cookie).toHaveBeenCalledWith("token", "signed-token", expect.objectContaining({ path: "/", maxAge: expect.any(Number) }));
    expect(res.clearCookie).toHaveBeenCalledWith("token", { httpOnly: true, secure: true, sameSite: "lax", path: "/" });
  });

  it("detects a cross-origin Railway API request in production", () => {
    process.env.NODE_ENV = "production";
    const req = { get: (name) => ({ origin: "https://recipe.thibault-nguyen.dev", host: "recipe-production-4bd0.up.railway.app" })[name] };
    expect(isCrossOriginSessionRequest(req)).toBe(true);
  });

  it("overrides stale lax cookie settings for cross-origin production login", () => {
    process.env.NODE_ENV = "production";
    process.env.COOKIE_SAME_SITE = "lax";
    process.env.COOKIE_PARTITIONED = "false";
    const req = { get: (name) => ({ origin: "https://recipe.thibault-nguyen.dev", host: "recipe-production-4bd0.up.railway.app" })[name] };
    const res = { cookie: vi.fn(), clearCookie: vi.fn() };

    setSessionCookie(res, "signed-token", req);

    expect(res.cookie).toHaveBeenCalledWith("token", "signed-token", expect.objectContaining({
      secure: true,
      sameSite: "none",
      partitioned: true,
    }));
    expect(res.clearCookie).toHaveBeenCalledWith("token", expect.objectContaining({
      partitioned: false,
      sameSite: "none",
    }));
  });

  it("does not partition requests the browser identifies as same-site", () => {
    process.env.NODE_ENV = "production";
    const req = { get: (name) => ({
      "sec-fetch-site": "same-site",
      origin: "https://recipe.thibault-nguyen.dev",
      host: "api.recipe.thibault-nguyen.dev",
    })[name] };

    expect(isCrossOriginSessionRequest(req)).toBe(false);
  });
});
