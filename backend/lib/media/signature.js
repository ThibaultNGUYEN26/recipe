import { MediaValidationError } from "./errors.js";
import { Buffer } from "node:buffer";

const TYPES = [
  { mime: "image/png", matches: (b) => b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { mime: "image/jpeg", matches: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: "image/webp", matches: (b) => b.length >= 12 && b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP" },
];

export function detectImageMime(buffer) {
  return TYPES.find((type) => type.matches(buffer))?.mime ?? null;
}

export function verifyAvatarSignature(buffer, claimedMime) {
  const actualMime = detectImageMime(buffer);
  if (!actualMime) throw new MediaValidationError("Only valid JPEG, PNG, or WebP images are allowed", "UNSUPPORTED_IMAGE");
  const normalizedClaim = claimedMime === "image/jpg" ? "image/jpeg" : claimedMime;
  if (normalizedClaim !== actualMime) throw new MediaValidationError("The file content does not match its MIME type", "MIME_MISMATCH");
  return actualMime;
}
