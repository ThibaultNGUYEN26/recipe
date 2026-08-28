import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../index.js";

describe("API security headers", () => {
  it("protects API responses without blocking cross-origin media", async () => {
    const response = await request(app).get("/health/live").expect(200);

    expect(response.headers["x-powered-by"]).toBeUndefined();
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["referrer-policy"]).toBe("no-referrer");
    expect(response.headers["x-frame-options"]).toBe("DENY");
    expect(response.headers["cross-origin-resource-policy"]).toBe("cross-origin");
    expect(response.headers["content-security-policy"]).toContain("default-src 'none'");
    expect(response.headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  });
});
