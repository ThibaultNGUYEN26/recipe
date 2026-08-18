import { createHash, randomBytes } from "node:crypto";

export function newAccountToken() {
  return randomBytes(32).toString("base64url");
}

export function hashAccountToken(token) {
  return createHash("sha256").update(token).digest("hex");
}
