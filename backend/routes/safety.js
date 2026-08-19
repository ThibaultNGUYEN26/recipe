import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authenticate, requireAdmin } from "../middleware/authenticate.js";
import { safetyRateLimit } from "../middleware/rateLimit.js";

const router = Router();
const TARGET_TYPES = new Set(["user", "recipe", "comment"]);
const REASONS = new Set(["inappropriate", "spam", "misinformation", "copyright", "harassment", "other"]);

router.post("/reports", authenticate, safetyRateLimit, async (req, res) => {
  const type = String(req.body?.type || "").toLowerCase();
  const identifier = String(req.body?.id || "").trim();
  const reason = String(req.body?.reason || "").toLowerCase();
  const notes = String(req.body?.notes || "").trim();
  if (!TARGET_TYPES.has(type) || !identifier) return res.status(400).json({ error: "Invalid report target" });
  if (!REASONS.has(reason)) return res.status(400).json({ error: "Invalid report reason" });
  if (notes.length > 1000) return res.status(400).json({ error: "Report notes must be at most 1000 characters" });

  try {
    let target = null;
    if (type === "user") target = await prisma.user.findUnique({ where: { id: Number(identifier) }, select: { id: true } });
    if (type === "recipe") target = await prisma.recipe.findUnique({ where: { slug: identifier }, select: { id: true, authorId: true } });
    if (type === "comment") target = await prisma.comment.findUnique({ where: { id: Number(identifier) }, select: { id: true, userId: true } });
    if (!target) return res.status(404).json({ error: "Content not found" });
    const targetUserId = type === "user" ? target.id : (target.authorId ?? target.userId);
    if (targetUserId === req.user.id) return res.status(400).json({ error: "You cannot report your own content" });

    const report = await prisma.report.create({ data: {
      reporterId: req.user.id,
      targetType: type.toUpperCase(),
      targetUserId: type === "user" ? target.id : null,
      targetRecipeId: type === "recipe" ? target.id : null,
      targetCommentId: type === "comment" ? target.id : null,
      reason,
      notes: notes || null,
    } });
    res.status(201).json({ id: report.id, status: report.status });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to submit report" });
  }
});

router.get("/blocks", authenticate, async (req, res) => {
  const blocks = await prisma.userBlock.findMany({
    where: { blockerId: req.user.id },
    include: { blocked: { select: { id: true, username: true, name: true, avatarUrl: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json(blocks.map(({ blocked, createdAt }) => ({ ...blocked, createdAt })));
});

router.post("/blocks/:userId", authenticate, safetyRateLimit, async (req, res) => {
  const blockedId = Number(req.params.userId);
  if (!Number.isInteger(blockedId) || blockedId === req.user.id) return res.status(400).json({ error: "Invalid user" });
  try {
    const user = await prisma.user.findUnique({ where: { id: blockedId }, select: { id: true } });
    if (!user) return res.status(404).json({ error: "User not found" });
    await prisma.$transaction([
      prisma.userBlock.upsert({ where: { blockerId_blockedId: { blockerId: req.user.id, blockedId } }, update: {}, create: { blockerId: req.user.id, blockedId } }),
      prisma.follow.deleteMany({ where: { OR: [{ followerId: req.user.id, followingId: blockedId }, { followerId: blockedId, followingId: req.user.id }] } }),
    ]);
    res.status(201).json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to block user" });
  }
});

router.delete("/blocks/:userId", authenticate, safetyRateLimit, async (req, res) => {
  await prisma.userBlock.deleteMany({ where: { blockerId: req.user.id, blockedId: Number(req.params.userId) } });
  res.json({ ok: true });
});

router.get("/admin/reports", authenticate, requireAdmin, async (req, res) => {
  const status = String(req.query.status || "PENDING").toUpperCase();
  const reports = await prisma.report.findMany({
    where: ["PENDING", "REVIEWED", "DISMISSED", "ACTIONED"].includes(status) ? { status } : undefined,
    include: {
      reporter: { select: { id: true, username: true, name: true } },
      targetUser: { select: { id: true, username: true, name: true } },
      targetRecipe: { select: { slug: true, translations: { select: { title: true, language: true } } } },
      targetComment: { select: { id: true, text: true, recipe: { select: { slug: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  res.json(reports);
});

router.patch("/admin/reports/:id", authenticate, requireAdmin, async (req, res) => {
  const status = String(req.body?.status || "").toUpperCase();
  if (!["REVIEWED", "DISMISSED", "ACTIONED"].includes(status)) return res.status(400).json({ error: "Invalid report status" });
  try {
    const report = await prisma.report.update({ where: { id: Number(req.params.id) }, data: { status } });
    res.json({ id: report.id, status: report.status });
  } catch (error) {
    if (error.code === "P2025") return res.status(404).json({ error: "Report not found" });
    res.status(500).json({ error: "Failed to update report" });
  }
});

export default router;
