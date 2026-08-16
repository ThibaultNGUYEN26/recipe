import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();

// GET /api/notifications
router.get("/", authenticate, async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      include: {
        actor: { select: { id: true, name: true, avatarUrl: true } },
        recipe: { select: { slug: true, translations: { where: { language: "fr" }, select: { title: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    res.json(notifications.map((n) => ({
      id: n.id,
      type: n.type,
      read: n.read,
      message: n.message,
      createdAt: n.createdAt,
      actor: { id: n.actor.id, name: n.actor.name, avatarUrl: n.actor.avatarUrl },
      recipeSlug: n.recipe?.slug ?? null,
      recipeTitle: n.recipe?.translations[0]?.title ?? null,
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to fetch notifications" });
  }
});

// PATCH /api/notifications/read  — mark all read
router.patch("/read", authenticate, async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, read: false },
      data: { read: true },
    });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to mark notifications read" });
  }
});

// GET /api/notifications/unread-count
router.get("/unread-count", authenticate, async (req, res) => {
  try {
    const count = await prisma.notification.count({ where: { userId: req.user.id, read: false } });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to fetch count" });
  }
});

export default router;
