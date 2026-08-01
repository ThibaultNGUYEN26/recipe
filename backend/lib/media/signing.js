import crypto from "crypto";
import { Buffer } from "node:buffer";
import process from "node:process";

function secret() {
  const value = process.env.MEDIA_SIGNING_SECRET;
  if (!value && process.env.NODE_ENV === "production") throw new Error("MEDIA_SIGNING_SECRET is required in production");
  return value || "development-only-media-signing-secret";
}

function payload(assetId, variant, expires) {
  return `${assetId}:${variant}:${expires}`;
}

export function signPrivateMedia(assetId, variant, expires) {
  return crypto.createHmac("sha256", secret()).update(payload(assetId, variant, expires)).digest("hex");
}

export function verifyPrivateMediaSignature(assetId, variant, expires, signature) {
  if (!Number.isSafeInteger(expires) || expires <= Math.floor(Date.now() / 1000)) return false;
  const expected = signPrivateMedia(assetId, variant, expires);
  if (typeof signature !== "string" || signature.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
