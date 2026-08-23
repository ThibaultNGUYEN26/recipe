import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../index.js";

describe("authentication session lifecycle", () => {
  it("clears the session cookie when signing out", async () => {
    const response = await request(app)
      .post("/api/auth/logout")
      .set("Origin", "http://localhost:5173")
      .expect(200);

    expect(response.body).toEqual({ ok: true });
    const cookies = response.headers["set-cookie"] ?? [];
    expect(cookies).toHaveLength(2);
    expect(cookies.every((cookie) => cookie.startsWith("token=;"))).toBe(true);
    expect(cookies.every((cookie) => cookie.includes("Expires=Thu, 01 Jan 1970"))).toBe(true);
  });
});
