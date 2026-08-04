import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/authenticate.js";
import { createNotification } from "../lib/notify.js";
import { submitAvatar, deleteOwnAvatar } from "../lib/media/avatarService.js";
import { handleAvatarUpload } from "../lib/media/upload.js";
import { DEFAULT_AVATAR_URL } from "../lib/media/config.js";
import { uploadRateLimit } from "../middleware/uploadRateLimit.js";
import { normalizeUsername, validateUsername } from "../lib/username.js";

const router = Router();

// GET /api/users?q=
router.get("/", async (req, res) => {
  const { q = "" } = req.query;
  const query = String(q).trim();
  const usernameQuery = normalizeUsername(query);
  try {
    const select = { id: true, username: true, name: true, avatarUrl: true };
    const [exactUser, matches] = await Promise.all([
      usernameQuery ? prisma.user.findUnique({ where: { username: usernameQuery }, select }) : null,
      prisma.user.findMany({
        where: query ? {
          OR: [
            { username: { contains: usernameQuery, mode: "insensitive" } },
            { name: { contains: query, mode: "insensitive" } },
          ],
        } : undefined,
        select,
        take: 20,
      }),
    ]);
    const users = exactUser
      ? [exactUser, ...matches.filter((user) => user.id !== exactUser.id)]
      : matches;
    users.sort((a, b) => {
      const aExact = a.username === usernameQuery ? 1 : 0;
      const bExact = b.username === usernameQuery ? 1 : 0;
      const aPrefix = a.username?.startsWith(usernameQuery) ? 1 : 0;
      const bPrefix = b.username?.startsWith(usernameQuery) ? 1 : 0;
      return bExact - aExact || bPrefix - aPrefix || (a.username ?? a.name ?? "").localeCompare(b.username ?? b.name ?? "");
    });
    res.json(users.slice(0, 20));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to search users" });
  }
});

// GET /api/users/me/saved
router.get("/me/saved", authenticate, async (req, res) => {
  const { lang = "fr" } = req.query;
  try {
    const saved = await prisma.savedRecipe.findMany({
      where: { userId: req.user.id },
      include: {
        recipe: {
          include: {
            category: true,
            images: { where: { isMain: true } },
            translations: { where: { language: lang } },
          },
        },
      },
      orderBy: { savedAt: "desc" },
    });

    res.json(saved.map(({ recipe: r }) => {
      const t = r.translations[0];
      return {
        slug: r.slug,
        title: t?.title,
        description: t?.description,
        image: r.images[0]?.url || null,
        category: { slug: r.category.slug, label: r.category.label },
      };
    }));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to fetch saved recipes" });
  }
});

// GET /api/my-recipes (own recipes)
router.get("/me/recipes", authenticate, async (req, res) => {
  const { lang = "fr" } = req.query;
  try {
    const recipes = await prisma.recipe.findMany({
      where: { authorId: req.user.id },
      include: {
        category: true,
        images: { where: { isMain: true } },
        translations: { where: { language: lang } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(recipes.map((r) => {
      const t = r.translations[0];
      return {
        slug: r.slug,
        title: t?.title,
        description: t?.description,
        image: r.images[0]?.url || null,
        category: { slug: r.category.slug, label: r.category.label },
        isPublic: r.isPublic,
        createdAt: r.createdAt,
      };
    }));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to fetch your recipes" });
  }
});

// PATCH /api/users/me
router.patch("/me", authenticate, uploadRateLimit, handleAvatarUpload, async (req, res) => {
  const { name, bio } = req.body;
  const usernameResult = req.body.username === undefined ? null : validateUsername(req.body.username);
  if (usernameResult?.error) {
    return res.status(400).json({ error: usernameResult.error, code: "INVALID_USERNAME" });
  }

  try {
    let avatarResult = null;
    if (req.file) {
      avatarResult = await submitAvatar({ actorId: req.user.id, ownerId: req.user.id, file: req.file });
    }
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(name !== undefined && { name }),
        ...(bio !== undefined && { bio }),
        ...(usernameResult && { username: usernameResult.username }),
      },
      select: { id: true, username: true, name: true, email: true, bio: true, avatarUrl: true },
    });
    res.status(avatarResult?.status === "approved" || !avatarResult ? 200 : 202).json({
      user: { ...user, avatarUrl: user.avatarUrl || DEFAULT_AVATAR_URL },
      avatarStatus: avatarResult?.status ?? null,
    });
  } catch (err) {
    if (err.code === "P2002") return res.status(409).json({ error: "Username already taken", code: "USERNAME_TAKEN" });
    console.error(err);
    res.status(err.statusCode || 500).json({ error: err.message || "Failed to update profile", code: err.code });
  }
});

router.get("/me/avatar-status", authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      avatarUrl: true,
      pendingAvatar: { select: { id: true, status: true, rejectionCategory: true, createdAt: true } },
    },
  });
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ approvedAvatarUrl: user.avatarUrl || DEFAULT_AVATAR_URL, pendingAvatar: user.pendingAvatar });
});

router.delete("/me/avatar", authenticate, async (req, res) => {
  try {
    const result = await deleteOwnAvatar({ ownerId: req.user.id });
    res.json(result);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || "Failed to delete profile picture" });
  }
});

// GET /api/users/:id
router.get("/:id", async (req, res) => {
  const userId = parseInt(req.params.id);
  if (isNaN(userId)) return res.status(400).json({ error: "Invalid user id" });

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, name: true, bio: true, avatarUrl: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ error: "User not found" });

    const [followerCount, followingCount, recipeCount] = await Promise.all([
      prisma.follow.count({ where: { followingId: userId } }),
      prisma.follow.count({ where: { followerId: userId } }),
      prisma.recipe.count({ where: { authorId: userId, isPublic: true } }),
    ]);

    res.json({ ...user, followerCount, followingCount, recipeCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to fetch user" });
  }
});

// GET /api/users/:id/recipes
router.get("/:id/recipes", async (req, res) => {
  const userId = parseInt(req.params.id);
  const { lang = "fr" } = req.query;
  if (isNaN(userId)) return res.status(400).json({ error: "Invalid user id" });

  try {
    const recipes = await prisma.recipe.findMany({
      where: { authorId: userId, isPublic: true },
      include: {
        category: true,
        images: { where: { isMain: true } },
        translations: { where: { language: lang } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(recipes.map((r) => {
      const t = r.translations[0];
      return {
        slug: r.slug,
        title: t?.title,
        description: t?.description,
        image: r.images[0]?.url || null,
        category: { slug: r.category.slug, label: r.category.label },
      };
    }));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to fetch user recipes" });
  }
});

// POST /api/users/:id/follow
router.post("/:id/follow", authenticate, async (req, res) => {
  const followingId = parseInt(req.params.id);
  if (followingId === req.user.id) return res.status(400).json({ error: "Cannot follow yourself" });

  try {
    await prisma.follow.create({ data: { followerId: req.user.id, followingId } });
    createNotification({ userId: followingId, actorId: req.user.id, type: "follow" });
    res.status(201).json({ ok: true });
  } catch (err) {
    if (err.code === "P2002") return res.status(409).json({ error: "Already following" });
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to follow" });
  }
});

// DELETE /api/users/:id/follow
router.delete("/:id/follow", authenticate, async (req, res) => {
  const followingId = parseInt(req.params.id);
  try {
    await prisma.follow.deleteMany({ where: { followerId: req.user.id, followingId } });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to unfollow" });
  }
});

// GET /api/users/:id/followers
router.get("/:id/followers", async (req, res) => {
  const userId = parseInt(req.params.id);
  try {
    const follows = await prisma.follow.findMany({
      where: { followingId: userId },
      include: { follower: { select: { id: true, username: true, name: true, avatarUrl: true } } },
    });
    res.json(follows.map((f) => f.follower));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to fetch followers" });
  }
});

// GET /api/users/:id/following
router.get("/:id/following", async (req, res) => {
  const userId = parseInt(req.params.id);
  try {
    const follows = await prisma.follow.findMany({
      where: { followerId: userId },
      include: { following: { select: { id: true, username: true, name: true, avatarUrl: true } } },
    });
    res.json(follows.map((f) => f.following));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to fetch following" });
  }
});

export default router;
