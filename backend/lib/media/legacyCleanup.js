import fs from "fs/promises";
import path from "path";
import { prisma } from "../prisma.js";
import { uploadsDir } from "../upload.js";

export async function cleanupUnreferencedLegacyUploads({ db = prisma, directory = uploadsDir } = {}) {
  const [images, videos] = await Promise.all([
    db.recipeImage.findMany({ select: { url: true } }),
    db.recipe.findMany({ where: { videoUrl: { not: null } }, select: { videoUrl: true } }),
  ]);
  const referenced = new Set([...images.map((item) => item.url), ...videos.map((item) => item.videoUrl)]);
  const entries = await fs.readdir(directory, { withFileTypes: true }).catch((error) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  let removed = 0;
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const url = `/uploads/${entry.name}`;
    if (referenced.has(url)) continue;
    const target = path.resolve(directory, entry.name);
    if (path.dirname(target) !== path.resolve(directory)) continue;
    await fs.unlink(target);
    removed += 1;
  }
  return removed;
}
