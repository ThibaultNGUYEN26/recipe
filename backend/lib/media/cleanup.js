import { prisma } from "../prisma.js";
import { mediaConfig } from "./config.js";
import { mediaStorage } from "./storage.js";
import { removeAssetObjects } from "./avatarService.js";

export async function cleanupAbandonedMedia({ db = prisma, storage = mediaStorage, now = new Date() } = {}) {
  const cutoff = new Date(now.getTime() - mediaConfig.quarantineRetentionHours * 60 * 60 * 1000);
  const abandoned = await db.mediaAsset.findMany({
    where: { status: { in: ["UPLOADING", "PENDING", "FAILED", "REJECTED"] }, createdAt: { lt: cutoff } },
  });
  let removed = 0;
  for (const asset of abandoned) {
    try {
      await db.user.updateMany({ where: { pendingAvatarId: asset.id }, data: { pendingAvatarId: null } });
      await removeAssetObjects(asset, storage);
      if (asset.status === "REJECTED") {
        await db.mediaAsset.update({ where: { id: asset.id }, data: { quarantineKey: null, variants: null, processingError: null } });
      } else {
        await db.mediaAsset.delete({ where: { id: asset.id } });
      }
      removed += 1;
    } catch (error) {
      await db.mediaAsset.update({
        where: { id: asset.id },
        data: { processingError: `CLEANUP_FAILED: ${error.message}`.slice(0, 500) },
      }).catch(() => {});
    }
  }
  return removed;
}

export function startMediaCleanup() {
  cleanupAbandonedMedia().catch((error) => console.error("Initial media cleanup failed", error));
  const timer = setInterval(() => {
    cleanupAbandonedMedia().catch((error) => console.error("Scheduled media cleanup failed", error));
  }, 6 * 60 * 60 * 1000);
  timer.unref();
  return timer;
}
