import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/authenticate.js";
import { clearSessionCookie } from "../lib/session.js";

const router = Router();

router.get("/export", authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true, email: true, username: true, name: true, preferredLanguage: true,
        emailVerifiedAt: true, isVerified: true, bio: true, avatarUrl: true, createdAt: true,
        recipes: { include: { translations: true, images: true, category: { select: { slug: true, label: true } } } },
        comments: { select: { id: true, recipeId: true, text: true, parentId: true, createdAt: true } },
        ratings: { select: { recipeId: true, score: true, createdAt: true } },
        savedRecipes: { select: { recipeId: true, savedAt: true, savedCategory: { select: { name: true } } } },
        recipeLikes: { select: { recipeId: true, createdAt: true } },
        recipeViews: { select: { recipeId: true, viewedAt: true } },
        commentLikes: { select: { commentId: true } },
        following: { select: { followingId: true, createdAt: true } },
        followers: { select: { followerId: true, createdAt: true } },
        notifications: { select: { type: true, recipeId: true, message: true, read: true, createdAt: true } },
        sentNotifications: { select: { type: true, recipeId: true, createdAt: true } },
        verifications: { select: { type: true, status: true, socialLinks: true, message: true, rejectionReason: true, reviewedAt: true, createdAt: true } },
        blockedUsers: { select: { blockedId: true, createdAt: true } },
        reportsSubmitted: { select: { id: true, targetType: true, reason: true, notes: true, status: true, createdAt: true } },
      },
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    const exportedAt = new Date().toISOString();
    res.setHeader("Content-Disposition", `attachment; filename="savor-data-${exportedAt.slice(0, 10)}.json"`);
    res.json({ service: "Savor", exportedAt, user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to export account data" });
  }
});

router.delete("/account", authenticate, async (req, res) => {
  if (req.body?.confirmation !== "DELETE") {
    return res.status(400).json({ error: "Type DELETE to confirm account deletion" });
  }
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { passwordHash: true } });
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.passwordHash) {
      const valid = typeof req.body.password === "string" && await bcrypt.compare(req.body.password, user.passwordHash);
      if (!valid) return res.status(401).json({ error: "Current password is incorrect" });
    }
    await prisma.user.delete({ where: { id: req.user.id } });
    clearSessionCookie(res, req);
    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete account" });
  }
});

export default router;
