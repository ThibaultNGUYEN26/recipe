import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { mediaConfig } from "./config.js";

const KEY_PATTERN = /^[a-f0-9-]+(?:\.webp|\.bin)$/;

function safePath(area, key) {
  if (!KEY_PATTERN.test(key) || path.basename(key) !== key) throw new Error("Invalid media storage key");
  const base = path.join(mediaConfig.storageRoot, area);
  const resolved = path.resolve(base, key);
  if (path.dirname(resolved) !== path.resolve(base)) throw new Error("Media path escaped storage root");
  return resolved;
}

async function ensureArea(area) {
  const directory = path.join(mediaConfig.storageRoot, area);
  await fs.mkdir(directory, { recursive: true });
  return directory;
}

export function randomStorageKey(extension = ".bin") {
  return `${crypto.randomUUID()}${extension}`;
}

export const mediaStorage = {
  async putQuarantine(buffer, extension = ".bin") {
    await ensureArea("quarantine");
    const key = randomStorageKey(extension);
    await fs.writeFile(safePath("quarantine", key), buffer, { flag: "wx", mode: 0o600 });
    return key;
  },
  async readQuarantine(key) {
    return fs.readFile(safePath("quarantine", key));
  },
  async publish(key) {
    await ensureArea("approved");
    const publicKey = randomStorageKey(".webp");
    await fs.rename(safePath("quarantine", key), safePath("approved", publicKey));
    return publicKey;
  },
  async readApproved(key) {
    return fs.readFile(safePath("approved", key));
  },
  async removeQuarantine(key) {
    if (!key) return;
    await fs.unlink(safePath("quarantine", key)).catch((err) => {
      if (err.code !== "ENOENT") throw err;
    });
  },
  async removeApproved(key) {
    if (!key) return;
    await fs.unlink(safePath("approved", key)).catch((err) => {
      if (err.code !== "ENOENT") throw err;
    });
  },
};
