import { Buffer } from "node:buffer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { moderateMedia } from "../lib/media/moderation.js";

const input = { buffer: Buffer.from("image"), mimeType: "image/webp" };

function configureProvider() {
  vi.stubEnv("SIGHTENGINE_API_USER", "test-user");
  vi.stubEnv("SIGHTENGINE_API_SECRET", "test-secret");
  vi.stubEnv("MEDIA_MODERATION_DEV_DECISION", "");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("media moderation fail-closed behavior", () => {
  it("requires manual review when the provider is not configured", async () => {
    vi.stubEnv("SIGHTENGINE_API_USER", "");
    vi.stubEnv("SIGHTENGINE_API_SECRET", "");
    vi.stubEnv("MEDIA_MODERATION_DEV_DECISION", "");

    await expect(moderateMedia(input)).resolves.toMatchObject({
      decision: "review_required",
      provider: "sightengine-not-configured",
    });
  });

  it("requires manual review when credentials are rejected", async () => {
    configureProvider();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401 }));

    await expect(moderateMedia(input)).resolves.toMatchObject({
      decision: "review_required",
      provider: "sightengine-http-401",
    });
  });

  it("requires manual review when the provider returns an invalid response", async () => {
    configureProvider();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: "failure", error: { type: "invalid_request" } }),
    }));

    await expect(moderateMedia(input)).resolves.toMatchObject({
      decision: "review_required",
      provider: "sightengine-invalid-response",
    });
  });

  it("requires manual review when the provider is unavailable", async () => {
    configureProvider();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("provider down")));

    await expect(moderateMedia(input)).resolves.toMatchObject({
      decision: "review_required",
      provider: "sightengine-unavailable",
    });
  });

  it("only approves after a successful safe moderation response", async () => {
    configureProvider();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: "success", nudity: {}, gore: {}, recreational_drug: {}, hate_symbol: {}, weapon: 0 }),
    }));

    await expect(moderateMedia(input)).resolves.toMatchObject({
      decision: "approved",
      provider: "sightengine",
    });
  });
});
