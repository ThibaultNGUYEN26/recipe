import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authenticate, optionalAuthenticate } from "../middleware/authenticate.js";
import { createNotification } from "../lib/notify.js";
import { commentRateLimit, likeRateLimit } from "../middleware/rateLimit.js";
import { blockedUserIds, usersAreBlocked } from "../lib/blocks.js";

const router = Router({ mergeParams: true });

const formatComment = (c, userId) => ({
  id: c.id,
  text: c.text,
  createdAt: c.createdAt,
  parentId: c.parentId,
  likesCount: c.likes?.length ?? 0,
  isLiked: userId ? c.likes?.some((l) => l.userId === userId) : false,
  author: { id: c.user.id, name: c.user.name, avatarUrl: c.user.avatarUrl, isVerified: c.user.isVerified },
  replies: (c.children ?? []).map((child) => formatComment(child, userId)),
});

// GET /api/recipes/:slug/comments
router.get("/", optionalAuthenticate, async (req, res) => {
  try {
    const recipe = await prisma.recipe.findUnique({ where: { slug: req.params.slug } });
    if (!recipe) return res.status(404).json({ error: "Recipe not found" });

    const excludedUsers = await blockedUserIds(req.user?.id);
    const comments = await prisma.comment.findMany({
      where: { recipeId: recipe.id, parentId: null, ...(excludedUsers.length && { userId: { notIn: excludedUsers } }) },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true, isVerified: true } },
        likes: { select: { userId: true } },
        children: {
          where: excludedUsers.length ? { userId: { notIn: excludedUsers } } : undefined,
          include: {
            user: { select: { id: true, name: true, avatarUrl: true, isVerified: true } },
            likes: { select: { userId: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(comments.map((c) => formatComment(c, req.user?.id)));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to fetch comments" });
  }
});

// POST /api/recipes/:slug/comments
router.post("/", authenticate, commentRateLimit, async (req, res) => {
  const { text, parentId } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: "Comment text is required" });

  try {
    const recipe = await prisma.recipe.findUnique({ where: { slug: req.params.slug } });
    if (!recipe) return res.status(404).json({ error: "Recipe not found" });
    if (recipe.authorId && await usersAreBlocked(req.user.id, recipe.authorId)) return res.status(403).json({ error: "This interaction is not allowed" });

    if (parentId) {
      const parent = await prisma.comment.findUnique({ where: { id: parseInt(parentId) } });
      if (!parent || parent.recipeId !== recipe.id) return res.status(400).json({ error: "Invalid parent comment" });
      if (parent.parentId !== null) return res.status(400).json({ error: "Cannot nest replies more than one level" });
    }

    const comment = await prisma.comment.create({
      data: {
        recipeId: recipe.id,
        userId: req.user.id,
        text: text.trim(),
        parentId: parentId ? parseInt(parentId) : null,
      },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true, isVerified: true } },
        likes: { select: { userId: true } },
        children: {
          include: {
            user: { select: { id: true, name: true, avatarUrl: true, isVerified: true } },
            likes: { select: { userId: true } },
          },
        },
      },
    });

    res.status(201).json(formatComment(comment, req.user.id));

    // Notify recipe author and parent comment author
    if (recipe.authorId) createNotification({ userId: recipe.authorId, actorId: req.user.id, type: "comment", recipeId: recipe.id });
    if (parentId && comment.parentId) {
      const parent = await prisma.comment.findUnique({ where: { id: comment.parentId } }).catch(() => null);
      if (parent) createNotification({ userId: parent.userId, actorId: req.user.id, type: "comment", recipeId: recipe.id });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to post comment" });
  }
});

// DELETE /api/recipes/:slug/comments/:id
router.delete("/:id", authenticate, async (req, res) => {
  const commentId = parseInt(req.params.id);
  try {
    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) return res.status(404).json({ error: "Comment not found" });
    if (comment.userId !== req.user.id) return res.status(403).json({ error: "Not your comment" });

    await prisma.comment.delete({ where: { id: commentId } });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to delete comment" });
  }
});

// POST /api/recipes/:slug/comments/:id/like  (toggle)
router.post("/:id/like", authenticate, likeRateLimit, async (req, res) => {
  const commentId = parseInt(req.params.id);
  try {
    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) return res.status(404).json({ error: "Comment not found" });

    const existing = await prisma.commentLike.findUnique({
      where: { commentId_userId: { commentId, userId: req.user.id } },
    });

    if (existing) {
      await prisma.commentLike.delete({ where: { commentId_userId: { commentId, userId: req.user.id } } });
      const count = await prisma.commentLike.count({ where: { commentId } });
      return res.json({ isLiked: false, likesCount: count });
    }

    await prisma.commentLike.create({ data: { commentId, userId: req.user.id } });
    const count = await prisma.commentLike.count({ where: { commentId } });
    res.json({ isLiked: true, likesCount: count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to toggle like" });
  }
});

export default router;
