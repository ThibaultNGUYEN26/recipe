import path from "path";
import process from "node:process";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));

export const mediaConfig = Object.freeze({
  storageRoot: path.resolve(process.env.MEDIA_STORAGE_ROOT || path.join(here, "../../media-storage")),
  avatarMaxBytes: 5 * 1024 * 1024,
  avatarMinDimension: 128,
  avatarMaxDimension: 8192,
  avatarMaxPixels: 40_000_000,
  avatarSizes: [64, 128, 256, 512],
  quarantineRetentionHours: Number(process.env.MEDIA_QUARANTINE_RETENTION_HOURS || 24),
  moderationEndpoint: process.env.MEDIA_MODERATION_ENDPOINT || "",
  moderationApiKey: process.env.MEDIA_MODERATION_API_KEY || "",
  moderationTimeoutMs: Number(process.env.MEDIA_MODERATION_TIMEOUT_MS || 15_000),
});

export const DEFAULT_AVATAR_URL = "/api/media/default-avatar.svg";
