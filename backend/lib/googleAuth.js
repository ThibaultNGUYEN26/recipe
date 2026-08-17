import { createPublicKey, verify } from "node:crypto";
import { Buffer } from "node:buffer";

const GOOGLE_ISSUERS = new Set(["accounts.google.com", "https://accounts.google.com"]);
const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
let cachedKeys = new Map();
let keysExpireAt = 0;

function decodeBase64Url(value) {
  return Buffer.from(value, "base64url");
}

function decodeJson(value) {
  try {
    return JSON.parse(decodeBase64Url(value).toString("utf8"));
  } catch {
    throw new Error("Malformed Google credential");
  }
}

function cacheMaxAge(header) {
  const match = header?.match(/(?:^|,)\s*max-age=(\d+)/i);
  return match ? Number(match[1]) * 1000 : 60 * 60 * 1000;
}

async function getGoogleKey(kid) {
  if (Date.now() >= keysExpireAt || !cachedKeys.has(kid)) {
    const response = await fetch(GOOGLE_JWKS_URL);
    if (!response.ok) throw new Error("Unable to retrieve Google signing keys");
    const { keys = [] } = await response.json();
    cachedKeys = new Map(keys.map((key) => [key.kid, key]));
    keysExpireAt = Date.now() + cacheMaxAge(response.headers.get("cache-control"));
  }
  const key = cachedKeys.get(kid);
  if (!key) throw new Error("Unknown Google signing key");
  return key;
}

export async function verifyGoogleCredential(credential, clientId) {
  if (!clientId) throw new Error("Google authentication is not configured");
  if (typeof credential !== "string") throw new Error("Google credential is required");

  const parts = credential.split(".");
  if (parts.length !== 3) throw new Error("Malformed Google credential");
  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = decodeJson(encodedHeader);
  const payload = decodeJson(encodedPayload);
  if (header.alg !== "RS256" || !header.kid) throw new Error("Unsupported Google credential");

  const jwk = await getGoogleKey(header.kid);
  const publicKey = createPublicKey({ key: jwk, format: "jwk" });
  const validSignature = verify(
    "RSA-SHA256",
    Buffer.from(`${encodedHeader}.${encodedPayload}`),
    publicKey,
    decodeBase64Url(encodedSignature),
  );
  if (!validSignature) throw new Error("Invalid Google credential signature");

  const now = Math.floor(Date.now() / 1000);
  const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!GOOGLE_ISSUERS.has(payload.iss)) throw new Error("Invalid Google credential issuer");
  if (!audiences.includes(clientId)) throw new Error("Google credential was issued for another app");
  if (audiences.length > 1 && payload.azp !== clientId) {
    throw new Error("Google credential was authorized for another app");
  }
  if (!payload.exp || payload.exp <= now) throw new Error("Google credential has expired");
  if (payload.nbf && payload.nbf > now) throw new Error("Google credential is not active yet");
  if (!payload.sub || !payload.email || payload.email_verified !== true) {
    throw new Error("Google account email is not verified");
  }

  return {
    subject: payload.sub,
    email: payload.email.toLowerCase(),
    name: typeof payload.name === "string" ? payload.name.trim() : "",
  };
}
