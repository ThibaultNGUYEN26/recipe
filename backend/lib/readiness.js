import { access, statfs } from "node:fs/promises";
import { constants } from "node:fs";
import process from "node:process";
import { prisma } from "./prisma.js";
import { mediaConfig } from "./media/config.js";
import { captureOperationalAlert, captureOperationalFailure } from "./monitoring.js";

function threshold(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 && value <= 100 ? value : fallback;
}

async function checkDatabase() {
  const startedAt = performance.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const latencyMs = Math.round(performance.now() - startedAt);
    const warningMs = Number(process.env.DB_LATENCY_WARNING_MS || 1_000);
    if (latencyMs >= warningMs) {
      captureOperationalAlert("database-latency", "Database latency is elevated", { latencyMs, warningMs });
    }
    return { ok: true, latencyMs };
  } catch (error) {
    captureOperationalFailure("database-readiness", error);
    return { ok: false };
  }
}

async function checkMediaStorage() {
  try {
    await access(mediaConfig.storageRoot, constants.R_OK | constants.W_OK);
    const stats = await statfs(mediaConfig.storageRoot);
    const totalBytes = Number(stats.blocks) * Number(stats.bsize);
    const availableBytes = Number(stats.bavail) * Number(stats.bsize);
    const usedPercent = totalBytes > 0 ? Math.round(((totalBytes - availableBytes) / totalBytes) * 1_000) / 10 : 0;
    const warningPercent = threshold("MEDIA_DISK_WARNING_PERCENT", 80);
    const criticalPercent = threshold("MEDIA_DISK_CRITICAL_PERCENT", 90);

    if (usedPercent >= warningPercent) {
      captureOperationalAlert("media-disk-usage", "Media volume disk usage is elevated", {
        usedPercent,
        warningPercent,
        criticalPercent,
      });
    }
    return { ok: usedPercent < criticalPercent, usedPercent };
  } catch (error) {
    captureOperationalFailure("media-storage-readiness", error);
    return { ok: false };
  }
}

export async function readinessStatus() {
  const [database, mediaStorage] = await Promise.all([checkDatabase(), checkMediaStorage()]);
  return {
    ok: database.ok && mediaStorage.ok,
    checks: { database, mediaStorage },
  };
}
