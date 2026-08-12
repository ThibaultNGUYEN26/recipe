import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/authenticate.js";
import { createNotification } from "../lib/notify.js";
import { submitAvatar, deleteOwnAvatar } from "../lib/media/avatarService.js";
import { handleAvatarUpload } from "../lib/media/upload.js";
import { DEFAULT_AVATAR_URL } from "../lib/media/config.js";
import { uploadRateLimit } from "../middleware/uploadRateLimit.js";
import { normalizeUsername, validateUsername } from "../lib/username.js";
import { selectRecipeTranslation } from "../lib/translations.js";

const router = Router();
const SAVED_CATEGORY_MAX_LENGTH = 40;
const ANALYTICS_RANGES = new Set([7, 30, 90]);

export function startOfUtcDay(value = new Date()) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

export function percentChange(current, previous) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / previous) * 100);
}

function savedCategoryName(value) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

// GET /api/users?q=
router.get("/", async (req, res) => {
  const { q = "" } = req.query;
  const query = String(q).trim();
  const usernameQuery = normalizeUsername(query);
  try {
    const select = { id: true, username: true, name: true, avatarUrl: true, isVerified: true };
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
        savedCategory: { select: { id: true, name: true } },
        recipe: {
          include: {
            category: true,
            images: { where: { isMain: true } },
            translations: true,
          },
        },
      },
      orderBy: { savedAt: "desc" },
    });

    res.json(saved.map(({ recipe: r, savedCategory }) => {
      const selected = selectRecipeTranslation(r, lang);
      const t = selected.translation;
      return {
        slug: r.slug,
        title: t?.title,
        description: t?.description,
        image: r.images[0]?.url || r.sourceThumbnailUrl || null,
        category: { slug: r.category.slug, label: r.category.label },
        savedCategory,
        contentLanguage: selected.contentLanguage,
        originalLanguage: selected.originalLanguage,
        availableLanguages: selected.availableLanguages,
        isTranslated: selected.isTranslated,
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
        translations: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(recipes.map((r) => {
      const selected = selectRecipeTranslation(r, lang);
      const t = selected.translation;
      return {
        slug: r.slug,
        title: t?.title,
        description: t?.description,
        image: r.images[0]?.url || r.sourceThumbnailUrl || null,
        category: { slug: r.category.slug, label: r.category.label },
        isPublic: r.isPublic,
        createdAt: r.createdAt,
        contentLanguage: selected.contentLanguage,
        originalLanguage: selected.originalLanguage,
        availableLanguages: selected.availableLanguages,
        isTranslated: selected.isTranslated,
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
      avatarRejectionCategory: avatarResult?.rejectionCategory ?? null,
    });
  } catch (err) {
    if (err.code === "P2002") return res.status(409).json({ error: "Username already taken", code: "USERNAME_TAKEN" });
    console.error(err);
    res.status(err.statusCode || 500).json({ error: err.message || "Failed to update profile", code: err.code });
  }
});

// PATCH /api/users/me/preferences
router.patch("/me/preferences", authenticate, async (req, res) => {
  const preferredLanguage = String(req.body.preferredLanguage || "").toLowerCase();
  if (!['fr', 'en', 'es'].includes(preferredLanguage)) {
    return res.status(400).json({ error: "Unsupported preferred language" });
  }

  try {
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { preferredLanguage },
      select: { preferredLanguage: true },
    });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save language preference" });
  }
});

// GET /api/users/me/analytics?days=30&lang=en
router.get("/me/analytics", authenticate, async (req, res) => {
  const requestedDays = Number(req.query.days);
  const days = ANALYTICS_RANGES.has(requestedDays) ? requestedDays : 30;
  const lang = String(req.query.lang || "en");
  const to = new Date();
  const from = startOfUtcDay(new Date(to.getTime() - (days - 1) * 86400000));
  const previousFrom = new Date(from.getTime() - days * 86400000);

  try {
    const recipes = await prisma.recipe.findMany({
      where: { authorId: req.user.id },
      select: {
        id: true,
        slug: true,
        originalLanguage: true,
        translations: { select: { language: true, title: true } },
        images: { where: { isMain: true }, select: { url: true }, take: 1 },
      },
    });
    const recipeIds = recipes.map((recipe) => recipe.id);
    const recipeWhere = { recipeId: { in: recipeIds } };

    const [views, saves, ratings, followers, comments, allRatings] = await Promise.all([
      prisma.recipeView.findMany({ where: { ...recipeWhere, viewedAt: { gte: previousFrom, lte: to } }, select: { id: true, recipeId: true, viewerId: true, visitorId: true, viewedAt: true } }),
      prisma.savedRecipe.findMany({ where: { ...recipeWhere, savedAt: { gte: previousFrom, lte: to } }, select: { recipeId: true, savedAt: true } }),
      prisma.rating.findMany({ where: { ...recipeWhere, createdAt: { gte: previousFrom, lte: to } }, select: { recipeId: true, score: true, createdAt: true } }),
      prisma.follow.findMany({ where: { followingId: req.user.id, createdAt: { gte: previousFrom, lte: to } }, select: { sourceRecipeId: true, createdAt: true } }),
      prisma.comment.findMany({ where: { ...recipeWhere, createdAt: { gte: previousFrom, lte: to } }, select: { recipeId: true, createdAt: true } }),
      prisma.rating.findMany({ where: recipeWhere, select: { recipeId: true, score: true } }),
    ]);

    const inCurrent = (date) => date >= from;
    const currentViews = views.filter((item) => inCurrent(item.viewedAt));
    const currentSaves = saves.filter((item) => inCurrent(item.savedAt));
    const currentRatings = ratings.filter((item) => inCurrent(item.createdAt));
    const currentFollowers = followers.filter((item) => inCurrent(item.createdAt));
    const currentComments = comments.filter((item) => inCurrent(item.createdAt));
    const previous = {
      views: views.length - currentViews.length,
      saves: saves.length - currentSaves.length,
      ratings: ratings.length - currentRatings.length,
      followers: followers.length - currentFollowers.length,
      comments: comments.length - currentComments.length,
    };

    const dateKey = (date) => date.toISOString().slice(0, 10);
    const series = Array.from({ length: days }, (_, index) => {
      const date = new Date(from.getTime() + index * 86400000);
      return { date: dateKey(date), views: 0, saves: 0, ratings: 0, followers: 0, comments: 0 };
    });
    const dayMap = new Map(series.map((day) => [day.date, day]));
    for (const item of currentViews) dayMap.get(dateKey(item.viewedAt)).views += 1;
    for (const item of currentSaves) dayMap.get(dateKey(item.savedAt)).saves += 1;
    for (const item of currentRatings) dayMap.get(dateKey(item.createdAt)).ratings += 1;
    for (const item of currentFollowers) dayMap.get(dateKey(item.createdAt)).followers += 1;
    for (const item of currentComments) dayMap.get(dateKey(item.createdAt)).comments += 1;

    const uniqueViewers = new Set(currentViews.map((view) => view.viewerId ? `user:${view.viewerId}` : `visitor:${view.visitorId || view.id}`)).size;
    const avgRating = allRatings.length ? allRatings.reduce((sum, rating) => sum + rating.score, 0) / allRatings.length : null;
    const recipeById = new Map(recipes.map((recipe) => [recipe.id, recipe]));
    const topRecipes = recipes.map((recipe) => {
      const recipeRatings = currentRatings.filter((item) => item.recipeId === recipe.id);
      const lifetimeRatings = allRatings.filter((item) => item.recipeId === recipe.id);
      return {
        slug: recipe.slug,
        title: selectRecipeTranslation(recipe, lang).translation?.title || recipe.slug,
        image: recipe.images[0]?.url || recipe.sourceThumbnailUrl || null,
        views: currentViews.filter((item) => item.recipeId === recipe.id).length,
        saves: currentSaves.filter((item) => item.recipeId === recipe.id).length,
        ratings: recipeRatings.length,
        avgRating: lifetimeRatings.length ? lifetimeRatings.reduce((sum, item) => sum + item.score, 0) / lifetimeRatings.length : null,
        comments: currentComments.filter((item) => item.recipeId === recipe.id).length,
        followers: currentFollowers.filter((item) => item.sourceRecipeId === recipe.id).length,
      };
    }).sort((a, b) => b.views - a.views || b.saves - a.saves).slice(0, 8);

    const followSourceCounts = new Map();
    for (const follow of currentFollowers) {
      const key = follow.sourceRecipeId || "direct";
      followSourceCounts.set(key, (followSourceCounts.get(key) || 0) + 1);
    }
    const followSources = [...followSourceCounts.entries()].map(([id, count]) => {
      const recipe = id === "direct" ? null : recipeById.get(id);
      return { slug: recipe?.slug || null, title: recipe ? (selectRecipeTranslation(recipe, lang).translation?.title || recipe.slug) : "Profile & other", count };
    }).sort((a, b) => b.count - a.count);

    res.json({
      range: { days, from: from.toISOString(), to: to.toISOString() },
      summary: {
        views: { value: currentViews.length, change: percentChange(currentViews.length, previous.views) },
        saves: { value: currentSaves.length, change: percentChange(currentSaves.length, previous.saves) },
        ratings: { value: currentRatings.length, change: percentChange(currentRatings.length, previous.ratings) },
        followers: { value: currentFollowers.length, change: percentChange(currentFollowers.length, previous.followers) },
        comments: { value: currentComments.length, change: percentChange(currentComments.length, previous.comments) },
        uniqueViewers,
        avgRating,
        saveRate: currentViews.length ? (currentSaves.length / currentViews.length) * 100 : 0,
      },
      series,
      topRecipes,
      followSources,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to fetch creator analytics" });
  }
});

// GET /api/users/me/saved-categories
router.get("/me/saved-categories", authenticate, async (req, res) => {
  try {
    const categories = await prisma.savedCategory.findMany({
      where: { userId: req.user.id },
      select: { id: true, name: true, _count: { select: { recipes: true } } },
      orderBy: { name: "asc" },
    });
    res.json(categories.map(({ _count, ...category }) => ({ ...category, recipeCount: _count.recipes })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to fetch saved categories" });
  }
});

// POST /api/users/me/saved-categories
router.post("/me/saved-categories", authenticate, async (req, res) => {
  const name = savedCategoryName(req.body.name);
  if (!name || name.length > SAVED_CATEGORY_MAX_LENGTH) {
    return res.status(400).json({ error: `Category name must be 1-${SAVED_CATEGORY_MAX_LENGTH} characters` });
  }
  try {
    const category = await prisma.savedCategory.create({ data: { userId: req.user.id, name } });
    res.status(201).json({ ...category, recipeCount: 0 });
  } catch (err) {
    if (err.code === "P2002") return res.status(409).json({ error: "A category with this name already exists" });
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to create saved category" });
  }
});

// DELETE /api/users/me/saved-categories/:categoryId
router.delete("/me/saved-categories/:categoryId", authenticate, async (req, res) => {
  const categoryId = Number(req.params.categoryId);
  if (!Number.isInteger(categoryId)) return res.status(400).json({ error: "Invalid category id" });
  try {
    const result = await prisma.savedCategory.deleteMany({ where: { id: categoryId, userId: req.user.id } });
    if (!result.count) return res.status(404).json({ error: "Category not found" });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to delete saved category" });
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

// GET /api/users/by-username/:username
router.get("/by-username/:username", async (req, res) => {
  const username = normalizeUsername(req.params.username);
  if (!username) return res.status(400).json({ error: "Invalid username" });

  try {
    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true, username: true, name: true, bio: true, avatarUrl: true, isVerified: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ error: "User not found" });

    const [followerCount, followingCount, recipeCount] = await Promise.all([
      prisma.follow.count({ where: { followingId: user.id } }),
      prisma.follow.count({ where: { followerId: user.id } }),
      prisma.recipe.count({ where: { authorId: user.id, isPublic: true } }),
    ]);
    res.json({ ...user, followerCount, followingCount, recipeCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to fetch user" });
  }
});

// GET /api/users/:id
router.get("/:id", async (req, res) => {
  const userId = parseInt(req.params.id);
  if (isNaN(userId)) return res.status(400).json({ error: "Invalid user id" });

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, name: true, bio: true, avatarUrl: true, isVerified: true, createdAt: true },
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
        translations: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(recipes.map((r) => {
      const selected = selectRecipeTranslation(r, lang);
      const t = selected.translation;
      return {
        slug: r.slug,
        title: t?.title,
        description: t?.description,
        image: r.images[0]?.url || r.sourceThumbnailUrl || null,
        category: { slug: r.category.slug, label: r.category.label },
        contentLanguage: selected.contentLanguage,
        originalLanguage: selected.originalLanguage,
        availableLanguages: selected.availableLanguages,
        isTranslated: selected.isTranslated,
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
    let sourceRecipeId = null;
    if (typeof req.body.sourceRecipeSlug === "string") {
      const source = await prisma.recipe.findFirst({
        where: { slug: req.body.sourceRecipeSlug, authorId: followingId, isPublic: true },
        select: { id: true },
      });
      sourceRecipeId = source?.id ?? null;
    }
    await prisma.follow.create({ data: { followerId: req.user.id, followingId, sourceRecipeId } });
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
      include: { follower: { select: { id: true, username: true, name: true, avatarUrl: true, isVerified: true } } },
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
      include: { following: { select: { id: true, username: true, name: true, avatarUrl: true, isVerified: true } } },
    });
    res.json(follows.map((f) => f.following));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to fetch following" });
  }
});

export default router;
