import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { mediaStorage } from "../lib/media/storage.js";
import { signPrivateMedia, verifyPrivateMediaSignature } from "../lib/media/signing.js";
import { authenticate } from "../middleware/authenticate.js";
import { reviewAvatar } from "../lib/media/avatarService.js";

const router = Router();
const DEFAULT_AVATAR = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" rx="64" fill="#92400e"/><circle cx="64" cy="48" r="24" fill="#fef3c7"/><path d="M22 118c4-27 20-42 42-42s38 15 42 42" fill="#fef3c7"/></svg>`;
const AVATAR_VARIANTS = new Set(["64", "128", "256", "512"]);

function safeMediaHeaders(res, contentType, cacheControl) {
  res.set({
    "Content-Type": contentType,
    "Content-Disposition": "inline",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; sandbox",
    "Cache-Control": cacheControl,
  });
}

router.get("/default-avatar.svg", (_req, res) => {
  safeMediaHeaders(res, "image/svg+xml", "public, max-age=86400");
  res.send(DEFAULT_AVATAR);
});

router.get("/review", authenticate, async (req, res) => {
  const reviewer = await prisma.user.findUnique({ where: { id: req.user.id }, select: { isAdmin: true } });
  if (!reviewer?.isAdmin) return res.status(403).json({ error: "Administrator access required" });
  const items = await prisma.mediaAsset.findMany({
    where: { status: "REVIEW_REQUIRED" },
    select: { id: true, kind: true, ownerId: true, verifiedMime: true, width: true, height: true, moderationScores: true, createdAt: true },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
  res.json(items);
});

router.patch("/:id/review", authenticate, async (req, res) => {
  try {
    const result = await reviewAvatar({
      reviewerId: req.user.id,
      assetId: req.params.id,
      decision: req.body.decision,
      rejectionCategory: req.body.rejectionCategory,
    });
    res.json(result);
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message || "Review failed" });
  }
});

router.get("/:id/avatar-:size.webp", async (req, res) => {
  if (!AVATAR_VARIANTS.has(req.params.size)) return res.status(404).end();
  const asset = await prisma.mediaAsset.findFirst({
    where: { id: req.params.id, kind: "AVATAR", status: "APPROVED" },
    select: { variants: true },
  });
  const variant = asset?.variants?.[req.params.size];
  if (!variant?.key) return res.status(404).end();
  try {
    const bytes = await mediaStorage.readApproved(variant.key);
    safeMediaHeaders(res, "image/webp", "public, max-age=31536000, immutable");
    res.send(bytes);
  } catch {
    res.status(404).end();
  }
});

router.get("/:id/private-url", authenticate, async (req, res) => {
  const asset = await prisma.mediaAsset.findUnique({ where: { id: req.params.id }, select: { ownerId: true, status: true, variants: true } });
  if (!asset) return res.status(404).json({ error: "Media not found" });
  const requester = await prisma.user.findUnique({ where: { id: req.user.id }, select: { isAdmin: true } });
  if (asset.ownerId !== req.user.id && !requester?.isAdmin) return res.status(403).json({ error: "Not allowed" });
  if (asset.status === "APPROVED" || asset.status === "REJECTED") return res.status(409).json({ error: "Media is not in private review" });
  const variant = AVATAR_VARIANTS.has(String(req.query.size)) ? String(req.query.size) : "512";
  if (!asset.variants?.[variant]?.key) return res.status(404).json({ error: "Variant not found" });
  const expires = Math.floor(Date.now() / 1000) + 300;
  const signature = signPrivateMedia(req.params.id, variant, expires);
  res.json({ url: `/api/media/${req.params.id}/private/${variant}?expires=${expires}&signature=${signature}`, expires });
});

router.get("/:id/private/:size", async (req, res) => {
  const expires = Number(req.query.expires);
  if (!verifyPrivateMediaSignature(req.params.id, req.params.size, expires, req.query.signature)) return res.status(403).json({ error: "Invalid or expired media URL" });
  const asset = await prisma.mediaAsset.findFirst({
    where: { id: req.params.id, status: { in: ["PENDING", "REVIEW_REQUIRED", "FAILED"] } },
    select: { variants: true },
  });
  const variant = asset?.variants?.[req.params.size];
  if (!variant?.key) return res.status(404).end();
  try {
    const bytes = await mediaStorage.readQuarantine(variant.key);
    safeMediaHeaders(res, "image/webp", "private, no-store");
    res.send(bytes);
  } catch {
    res.status(404).end();
  }
});

export default router;
