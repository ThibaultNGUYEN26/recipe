import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateKeyPairSync, sign } from "node:crypto";
import { Buffer } from "node:buffer";
import { verifyGoogleCredential } from "../lib/googleAuth.js";

const clientId = "test-client.apps.googleusercontent.com";
const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const jwk = publicKey.export({ format: "jwk" });
jwk.kid = "test-key";
jwk.alg = "RS256";
jwk.use = "sig";

function credential(overrides = {}) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", kid: jwk.kid })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    iss: "https://accounts.google.com",
    aud: clientId,
    sub: "google-user-123",
    email: "Chef@Example.com",
    email_verified: true,
    name: "Test Chef",
    exp: now + 300,
    ...overrides,
  })).toString("base64url");
  const signature = sign("RSA-SHA256", Buffer.from(`${header}.${payload}`), privateKey).toString("base64url");
  return `${header}.${payload}.${signature}`;
}

describe("verifyGoogleCredential", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ keys: [jwk] }), {
      status: 200,
      headers: { "cache-control": "max-age=3600" },
    })));
  });

  afterEach(() => vi.unstubAllGlobals());

  it("verifies a signed Google identity and normalizes its email", async () => {
    await expect(verifyGoogleCredential(credential(), clientId)).resolves.toEqual({
      subject: "google-user-123",
      email: "chef@example.com",
      name: "Test Chef",
    });
  });

  it("rejects credentials issued for another app", async () => {
    await expect(verifyGoogleCredential(credential({ aud: "other-client" }), clientId))
      .rejects.toThrow("another app");
  });

  it("rejects expired credentials", async () => {
    await expect(verifyGoogleCredential(credential({ exp: 1 }), clientId))
      .rejects.toThrow("expired");
  });

  it("requires a verified Google email", async () => {
    await expect(verifyGoogleCredential(credential({ email_verified: false }), clientId))
      .rejects.toThrow("not verified");
  });
});
