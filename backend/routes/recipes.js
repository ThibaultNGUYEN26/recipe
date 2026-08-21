import { Router } from "express";
import jwt from "jsonwebtoken";
import { SESSION_COOKIE_NAME } from "../lib/session.js";
import fs from "fs";
import process from "node:process";
import { prisma } from "../lib/prisma.js";
import { authenticate, optionalAuthenticate } from "../middleware/authenticate.js";
import { recipeUpload } from "../lib/upload.js";
import { createNotification } from "../lib/notify.js";
import { diversifyRecommendations, scoreRecommendation } from "../lib/recommendations.js";
import { normalizeLanguage, selectRecipeTranslation } from "../lib/translations.js";
import { fetchTikTokImport, validateTikTokUrl } from "../lib/tiktokImport.js";
import { broadcastRecipeEvent } from "../lib/ws.js";
import { likeRateLimit } from "../middleware/rateLimit.js";
import { blockedUserIds, usersAreBlocked } from "../lib/blocks.js";

const router = Router();
const uploadRecipeMedia = recipeUpload.fields([
  { name: "image", maxCount: 1 },
  { name: "video", maxCount: 1 },
]);

function handleRecipeMedia(req, res, next) {
  uploadRecipeMedia(req, res, (err) => {
    if (!err) return next();
    const message = err.code === "LIMIT_FILE_SIZE"
      ? "Cooking video must be under 100 MB"
      : err.message;
    return res.status(400).json({ error: message });
  });
}

// GET /api/recipes
router.get("/", optionalAuthenticate, async (req, res) => {
  const { lang = "fr", category } = req.query;
  try {
    const excludedAuthors = await blockedUserIds(req.user?.id);
    const recipes = await prisma.recipe.findMany({
      where: { isPublic: true, ...(excludedAuthors.length && { authorId: { notIn: excludedAuthors } }), ...(category && { category: { slug: category } }) },
      include: {
        category: true,
        images: { where: { isMain: true } },
        translations: true,
        author: { select: { id: true, username: true, name: true, avatarUrl: true, isVerified: true } },
        ratings: { select: { score: true } },
        _count: { select: { likes: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = recipes.map((r) => {
      const selected = selectRecipeTranslation(r, lang);
      const t = selected.translation;
      const avgRating = r.ratings.length ? r.ratings.reduce((s, x) => s + x.score, 0) / r.ratings.length : null;
      return {
        slug: r.slug,
        title: t?.title,
        description: t?.description,
        image: r.images[0]?.url || r.sourceThumbnailUrl || null,
        category: { slug: r.category.slug, label: r.category.label },
        info: r.info,
        tags: r.tags,
        authorId: r.author?.id ?? null,
        authorUsername: r.author?.username ?? null,
        authorIsVerified: r.author?.isVerified ?? false,
        authorName: r.author?.name ?? null,
        authorAvatar: r.author?.avatarUrl ?? null,
        avgRating,
        ratingCount: r.ratings.length,
        likeCount: r._count.likes,
        contentLanguage: selected.contentLanguage,
        originalLanguage: selected.originalLanguage,
        availableLanguages: selected.availableLanguages,
        isTranslated: selected.isTranslated,
      };
    });

    res.json(formatted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to fetch recipes" });
  }
});

// GET /api/recipes/recommended — explainable rules-based discovery feeds.
router.get("/recommended", optionalAuthenticate, async (req, res) => {
  const lang = String(req.query.lang || "fr");
  const now = new Date();
  const recentFrom = new Date(now.getTime() - 30 * 86400000);
  const userId = req.user?.id ?? null;

  try {
    const excludedAuthors = await blockedUserIds(userId);
    const [recipes, saved, rated, viewed, follows] = await Promise.all([
      prisma.recipe.findMany({
        where: { isPublic: true, ...(userId ? { authorId: { not: userId, notIn: excludedAuthors } } : {}) },
        include: {
          category: true,
          images: { where: { isMain: true }, take: 1 },
          translations: true,
          author: { select: { id: true, username: true, name: true, avatarUrl: true, isVerified: true } },
          ratings: { select: { score: true } },
          savedBy: { select: { userId: true } },
          views: { where: { viewedAt: { gte: recentFrom } }, select: { id: true } },
          _count: { select: { likes: true } },
        },
      }),
      userId ? prisma.savedRecipe.findMany({ where: { userId }, select: { recipeId: true, recipe: { select: { category: { select: { slug: true } }, tags: true } } } }) : [],
      userId ? prisma.rating.findMany({ where: { userId, score: { gte: 4 } }, select: { recipeId: true, score: true, recipe: { select: { category: { select: { slug: true } }, tags: true } } } }) : [],
      userId ? prisma.recipeView.findMany({ where: { viewerId: userId, viewedAt: { gte: recentFrom } }, select: { recipeId: true, recipe: { select: { category: { select: { slug: true } }, tags: true } } } }) : [],
      userId ? prisma.follow.findMany({ where: { followerId: userId }, select: { followingId: true } }) : [],
    ]);

    const categories = new Map();
    const tags = new Map();
    const addPreference = (recipe, weight) => {
      const category = recipe.category.slug;
      categories.set(category, (categories.get(category) || 0) + weight);
      for (const tag of Array.isArray(recipe.tags) ? recipe.tags : []) {
        const key = String(tag).toLowerCase();
        tags.set(key, (tags.get(key) || 0) + weight * 0.5);
      }
    };
    for (const item of saved) addPreference(item.recipe, 3);
    for (const item of rated) addPreference(item.recipe, 2);
    for (const item of viewed) addPreference(item.recipe, 0.35);
    const savedIds = new Set(saved.map((item) => item.recipeId));
    const preferences = {
      categories,
      tags,
      following: new Set(follows.map((follow) => follow.followingId)),
      viewed: new Set(viewed.map((item) => item.recipeId)),
    };

    const formatted = recipes.filter((recipe) => recipe.translations.length).map((recipe) => {
      const scores = recipe.ratings.map((rating) => rating.score);
      const avgRating = scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
      const normalized = {
        id: recipe.id,
        createdAt: recipe.createdAt,
        avgRating,
        ratingCount: scores.length,
        saveCount: recipe.savedBy.length,
        recentViews: recipe.views.length,
        categorySlug: recipe.category.slug,
        categoryLabel: recipe.category.label,
        tags: (Array.isArray(recipe.tags) ? recipe.tags : []).map((tag) => String(tag).toLowerCase()),
        authorId: recipe.authorId,
      };
      const ranking = scoreRecommendation(normalized, preferences, now);
      const selected = selectRecipeTranslation(recipe, lang);
      const translation = selected.translation;
      return {
        ...normalized,
        avgRating: scores.length ? avgRating : null,
        ratingCount: scores.length,
        likeCount: recipe._count.likes,
        score: ranking.score,
        recommendationReason: ranking.reasonCode,
        recommendationReasonValue: ranking.reasonValue,
        slug: recipe.slug,
        title: translation.title,
        description: translation.description,
        image: recipe.images[0]?.url || recipe.sourceThumbnailUrl || null,
        category: { slug: recipe.category.slug, label: recipe.category.label },
        info: recipe.info,
        authorId: recipe.author?.id ?? null,
        authorUsername: recipe.author?.username ?? null,
        authorIsVerified: recipe.author?.isVerified ?? false,
        authorName: recipe.author?.name ?? null,
        authorAvatar: recipe.author?.avatarUrl ?? null,
        contentLanguage: selected.contentLanguage,
        originalLanguage: selected.originalLanguage,
        availableLanguages: selected.availableLanguages,
        isTranslated: selected.isTranslated,
      };
    });

    const ranked = [...formatted].sort((a, b) => b.score - a.score);
    // Prefer new discoveries, but keep saved recipes as a backfill for small catalogs.
    // Otherwise a user who saved every available recipe receives an empty "For You" feed.
    const byScore = [
      ...ranked.filter((recipe) => !savedIds.has(recipe.id)),
      ...ranked.filter((recipe) => savedIds.has(recipe.id)),
    ];
    const trending = [...formatted].sort((a, b) => (b.recentViews * 0.7 + b.saveCount * 2 + b.ratingCount) - (a.recentViews * 0.7 + a.saveCount * 2 + a.ratingCount)).slice(0, 20).map((recipe) => ({ ...recipe, recommendationReason: 'trending' }));
    const following = formatted.filter((recipe) => preferences.following.has(recipe.authorId)).sort((a, b) => b.score - a.score).map((recipe) => ({ ...recipe, recommendationReason: 'follow' }));
    res.json({
      personalized: diversifyRecommendations(byScore, 20),
      trending,
      following,
      personalizedForUser: Boolean(userId && (saved.length || rated.length || viewed.length || follows.length)),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to build recommendations" });
  }
});

// POST /api/recipes/import/tiktok
router.post("/import/tiktok", authenticate, async (req, res) => {
  try {
    const imported = await fetchTikTokImport(req.body.url);
    res.json(imported);
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message || "Failed to import TikTok recipe" });
  }
});

// GET /api/recipes/:slug
router.get("/:slug", optionalAuthenticate, async (req, res) => {
  const { slug } = req.params;
  const { lang = "fr" } = req.query;

  try {
    const recipe = await prisma.recipe.findUnique({
      where: { slug },
      include: {
        category: true,
        images: true,
        translations: true,
        author: { select: { id: true, username: true, name: true, avatarUrl: true, isVerified: true } },
      },
    });

    if (!recipe || recipe.translations.length === 0) return res.status(404).json({ error: "Recipe not found" });
    if (await usersAreBlocked(req.user?.id, recipe.authorId)) return res.status(404).json({ error: "Recipe not found" });

    const selected = selectRecipeTranslation(recipe, lang);
    const t = selected.translation;
    const agg = await prisma.rating.aggregate({
      where: { recipeId: recipe.id },
      _avg: { score: true },
      _count: { score: true },
    });

    const ratingDist = await prisma.rating.groupBy({
      by: ["score"],
      where: { recipeId: recipe.id },
      _count: true,
    });
    const ratingDistribution = Object.fromEntries(ratingDist.map((r) => [r.score, r._count]));

    let myRating = null;
    let isSaved = false;
    let savedCategoryId = null;
    let isLiked = false;
    const token = req.cookies?.[SESSION_COOKIE_NAME];
    if (token) {
      try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        const [ratingRow, savedRow] = await Promise.all([
          prisma.rating.findUnique({ where: { userId_recipeId: { userId: payload.id, recipeId: recipe.id } } }),
          prisma.savedRecipe.findUnique({ where: { userId_recipeId: { userId: payload.id, recipeId: recipe.id } } }),
        ]);
        myRating = ratingRow?.score ?? null;
        isSaved = !!savedRow;
        savedCategoryId = savedRow?.savedCategoryId ?? null;
        isLiked = myRating !== null;
      } catch { /* invalid token */ }
    }

    res.json({
      slug: recipe.slug,
      title: t.title,
      description: t.description,
      image: recipe.images.find((i) => i.isMain)?.url || recipe.sourceThumbnailUrl || null,
      category: { slug: recipe.category.slug, label: recipe.category.label },
      info: recipe.info,
      tags: recipe.tags,
      videoUrl: recipe.videoUrl,
      sourcePlatform: recipe.sourcePlatform,
      sourceUrl: recipe.sourceUrl,
      sourceAuthor: recipe.sourceAuthor,
      sourceThumbnailUrl: recipe.sourceThumbnailUrl,
      ingredients: t.ingredients,
      instructions: t.instructions,
      nutrition: t.nutrition,
      tips: t.tips,
      authorId: recipe.authorId,
      authorUsername: recipe.author?.username ?? null,
      authorIsVerified: recipe.author?.isVerified ?? false,
      authorName: recipe.author?.name ?? null,
      authorAvatar: recipe.author?.avatarUrl ?? null,
      avgRating: agg._avg.score,
      ratingCount: agg._count.score,
      ratingDistribution,
      myRating,
      isSaved,
      savedCategoryId,
      isLiked,
      contentLanguage: selected.contentLanguage,
      originalLanguage: selected.originalLanguage,
      availableLanguages: selected.availableLanguages,
      isTranslated: selected.isTranslated,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to fetch recipe" });
  }
});

// POST /api/recipes
router.post("/", authenticate, handleRecipeMedia, async (req, res) => {
  const {
    slug, categoryId, isPublic = "true",
    info, tags, sourcePlatform, sourceUrl, sourceAuthor, sourceThumbnailUrl,
    translations: rawTranslations,
    // single-language fallback
    lang = "fr", originalLanguage: rawOriginalLanguage, title, description, ingredients, instructions, tips, nutrition,
  } = req.body;

  const imageFile = req.files?.image?.[0];
  const videoFile = req.files?.video?.[0];
  const uploadedFiles = [imageFile, videoFile].filter(Boolean);
  const removeUploadedFiles = () => uploadedFiles.forEach((file) => fs.unlink(file.path, () => {}));

  if (imageFile && imageFile.size > 5 * 1024 * 1024) {
    removeUploadedFiles();
    return res.status(400).json({ error: "Cover image must be under 5 MB" });
  }

  if (!slug || !categoryId) {
    removeUploadedFiles();
    return res.status(400).json({ error: "Missing required fields" });
  }

  const rawCoverImageUrl = req.body.coverImageUrl;
  const externalImageUrl = !imageFile && rawCoverImageUrl && /^https:\/\//i.test(rawCoverImageUrl)
    ? String(rawCoverImageUrl).slice(0, 2048)
    : null;
  const imageUrl = imageFile ? `/uploads/${imageFile.filename}` : externalImageUrl;
  const videoUrl = videoFile ? `/uploads/${videoFile.filename}` : null;
  const validatedSourceUrl = sourcePlatform === "tiktok" ? validateTikTokUrl(sourceUrl) : null;

  if (sourcePlatform && !validatedSourceUrl) {
    removeUploadedFiles();
    return res.status(400).json({ error: "Invalid recipe source" });
  }

  try {
    // Support both multi-translation JSON payload and legacy single-lang fields
    let translationRows = [];
    if (rawTranslations) {
      translationRows = JSON.parse(rawTranslations); // [{language, title, description, ingredients, instructions, tips, nutrition}]
    } else if (title && ingredients && instructions) {
      translationRows = [{ language: lang, title, description, ingredients: JSON.parse(ingredients), instructions: JSON.parse(instructions), tips: tips ? JSON.parse(tips) : null, nutrition: nutrition ? JSON.parse(nutrition) : null }];
    }

    if (translationRows.length === 0) {
      removeUploadedFiles();
      return res.status(400).json({ error: "At least one translation required" });
    }

    const originalLanguage = normalizeLanguage(rawOriginalLanguage, normalizeLanguage(translationRows[0]?.language));
    if (!translationRows.some((row) => normalizeLanguage(row.language) === originalLanguage)) {
      removeUploadedFiles();
      return res.status(400).json({ error: "The original-language recipe is required" });
    }

    const recipe = await prisma.$transaction(async (tx) => {
      const r = await tx.recipe.create({
        data: {
          slug,
          originalLanguage,
          categoryId: parseInt(categoryId),
          isPublic: isPublic === "true",
          authorId: req.user.id,
          info: info ? JSON.parse(info) : null,
          tags: tags ? JSON.parse(tags) : null,
          videoUrl,
          sourcePlatform: validatedSourceUrl ? "tiktok" : null,
          sourceUrl: validatedSourceUrl,
          sourceAuthor: validatedSourceUrl ? String(sourceAuthor || "").trim().slice(0, 120) || null : null,
          sourceThumbnailUrl: validatedSourceUrl && /^https:\/\//i.test(String(sourceThumbnailUrl || "")) ? String(sourceThumbnailUrl).slice(0, 2048) : null,
        },
      });

      for (const tr of translationRows) {
        await tx.recipeTranslation.create({
          data: {
            recipeId: r.id,
            language: tr.language,
            title: tr.title,
            description: tr.description || null,
            ingredients: typeof tr.ingredients === "string" ? JSON.parse(tr.ingredients) : tr.ingredients,
            instructions: typeof tr.instructions === "string" ? JSON.parse(tr.instructions) : tr.instructions,
            tips: tr.tips ? (typeof tr.tips === "string" ? JSON.parse(tr.tips) : tr.tips) : null,
            nutrition: tr.nutrition ? (typeof tr.nutrition === "string" ? JSON.parse(tr.nutrition) : tr.nutrition) : null,
          },
        });
      }

      if (imageUrl) {
        await tx.recipeImage.create({ data: { recipeId: r.id, url: imageUrl, isMain: true } });
      }

      return r;
    });

    res.status(201).json({ slug: recipe.slug, id: recipe.id });
    broadcastRecipeEvent('recipe:created', recipe.slug);
  } catch (err) {
    removeUploadedFiles();
    console.error(err);
    if (err.code === "P2002") return res.status(409).json({ error: "Ce slug est déjà utilisé" });
    res.status(500).json({ error: err.message || "Failed to create recipe" });
  }
});

// DELETE /api/recipes/:slug
router.delete("/:slug", authenticate, async (req, res) => {
  try {
    const recipe = await prisma.recipe.findUnique({ where: { slug: req.params.slug } });
    if (!recipe) return res.status(404).json({ error: "Recipe not found" });
    if (recipe.authorId !== req.user.id) return res.status(403).json({ error: "Not your recipe" });
    await prisma.recipe.delete({ where: { slug: req.params.slug } });
    res.json({ ok: true });
    broadcastRecipeEvent('recipe:deleted', req.params.slug);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to delete recipe" });
  }
});

// PUT /api/recipes/:slug — update own recipe
router.put("/:slug", authenticate, handleRecipeMedia, async (req, res) => {
  const { slug } = req.params;
  try {
    const recipe = await prisma.recipe.findUnique({ where: { slug }, include: { images: { where: { isMain: true } } } });
    if (!recipe) return res.status(404).json({ error: "Recipe not found" });
    if (recipe.authorId !== req.user.id) return res.status(403).json({ error: "Not your recipe" });

    const { categoryId, info, tags, originalLanguage: rawOriginalLanguage, isPublic } = req.body;
    const rawTranslations = req.body.translations;

    const imageFile = req.files?.image?.[0];
    const videoFile = req.files?.video?.[0];
    const uploadedFiles = [imageFile, videoFile].filter(Boolean);
    const removeUploadedFiles = () => uploadedFiles.forEach((f) => fs.unlink(f.path, () => {}));

    if (imageFile && imageFile.size > 5 * 1024 * 1024) {
      removeUploadedFiles();
      return res.status(400).json({ error: "Cover image must be under 5 MB" });
    }

    const rawCoverImageUrl = req.body.coverImageUrl;
    const externalImageUrl = !imageFile && rawCoverImageUrl && /^https:\/\//i.test(rawCoverImageUrl)
      ? String(rawCoverImageUrl).slice(0, 2048)
      : null;
    const newImageUrl = imageFile ? `/uploads/${imageFile.filename}` : externalImageUrl;
    const newVideoUrl = videoFile ? `/uploads/${videoFile.filename}` : undefined;

    let translationRows = [];
    if (rawTranslations) {
      translationRows = JSON.parse(rawTranslations);
    }

    await prisma.$transaction(async (tx) => {
      await tx.recipe.update({
        where: { slug },
        data: {
          ...(categoryId ? { categoryId: parseInt(categoryId) } : {}),
          ...(info ? { info: JSON.parse(info) } : {}),
          ...(tags ? { tags: JSON.parse(tags) } : {}),
          ...(rawOriginalLanguage ? { originalLanguage: normalizeLanguage(rawOriginalLanguage) } : {}),
          ...(isPublic !== undefined ? { isPublic: isPublic === "true" } : {}),
          ...(newVideoUrl !== undefined ? { videoUrl: newVideoUrl } : {}),
        },
      });

      if (newImageUrl) {
        const existing = recipe.images[0];
        if (existing) {
          await tx.recipeImage.update({ where: { id: existing.id }, data: { url: newImageUrl } });
          if (existing.url.startsWith("/uploads/")) {
            fs.unlink(`${process.env.UPLOAD_DIR || "uploads"}/${existing.url.replace("/uploads/", "")}`, () => {});
          }
        } else {
          await tx.recipeImage.create({ data: { recipeId: recipe.id, url: newImageUrl, isMain: true } });
        }
      }

      for (const tr of translationRows) {
        const lang = normalizeLanguage(tr.language);
        await tx.recipeTranslation.upsert({
          where: { recipeId_language: { recipeId: recipe.id, language: lang } },
          update: {
            title: tr.title,
            description: tr.description || null,
            ingredients: typeof tr.ingredients === "string" ? JSON.parse(tr.ingredients) : tr.ingredients,
            instructions: typeof tr.instructions === "string" ? JSON.parse(tr.instructions) : tr.instructions,
            tips: tr.tips ? (typeof tr.tips === "string" ? JSON.parse(tr.tips) : tr.tips) : null,
          },
          create: {
            recipeId: recipe.id,
            language: lang,
            title: tr.title,
            description: tr.description || null,
            ingredients: typeof tr.ingredients === "string" ? JSON.parse(tr.ingredients) : tr.ingredients,
            instructions: typeof tr.instructions === "string" ? JSON.parse(tr.instructions) : tr.instructions,
            tips: tr.tips ? (typeof tr.tips === "string" ? JSON.parse(tr.tips) : tr.tips) : null,
          },
        });
      }
    });

    res.json({ slug });
    broadcastRecipeEvent('recipe:updated', slug);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to update recipe" });
  }
});

// POST /api/recipes/:slug/rate
router.post("/:slug/rate", authenticate, async (req, res) => {
  const { score } = req.body;
  if (!score || score < 0.5 || score > 5 || (score * 2) % 1 !== 0) return res.status(400).json({ error: "Score must be 0.5–5 in 0.5 increments" });

  try {
    const recipe = await prisma.recipe.findUnique({ where: { slug: req.params.slug } });
    if (!recipe) return res.status(404).json({ error: "Recipe not found" });

    await prisma.rating.upsert({
      where: { userId_recipeId: { userId: req.user.id, recipeId: recipe.id } },
      update: { score },
      create: { userId: req.user.id, recipeId: recipe.id, score },
    });

    const agg = await prisma.rating.aggregate({
      where: { recipeId: recipe.id },
      _avg: { score: true },
      _count: { score: true },
    });

    res.json({ avgRating: agg._avg.score, ratingCount: agg._count.score, myRating: score });
    if (recipe.authorId) createNotification({ userId: recipe.authorId, actorId: req.user.id, type: "rating", recipeId: recipe.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to rate recipe" });
  }
});

// Save a recipe, or move an existing save into the selected category.
router.post("/:slug/save", authenticate, async (req, res) => {
  try {
    const recipe = await prisma.recipe.findUnique({ where: { slug: req.params.slug } });
    if (!recipe) return res.status(404).json({ error: "Recipe not found" });
    const savedCategoryId = req.body.savedCategoryId == null ? null : Number(req.body.savedCategoryId);
    if (savedCategoryId !== null) {
      if (!Number.isInteger(savedCategoryId)) return res.status(400).json({ error: "Invalid category id" });
      const category = await prisma.savedCategory.findFirst({ where: { id: savedCategoryId, userId: req.user.id } });
      if (!category) return res.status(404).json({ error: "Saved category not found" });
    }
    const saved = await prisma.savedRecipe.upsert({
      where: { userId_recipeId: { userId: req.user.id, recipeId: recipe.id } },
      update: { savedCategoryId },
      create: { userId: req.user.id, recipeId: recipe.id, savedCategoryId },
    });
    res.status(201).json({ ok: true, savedCategoryId: saved.savedCategoryId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to save recipe" });
  }
});

// POST /api/recipes/:slug/view — deduplicated within a 30-minute visit window.
router.post("/:slug/view", async (req, res) => {
  const visitorId = typeof req.body.visitorId === "string" ? req.body.visitorId.slice(0, 80) : null;
  let viewerId = null;
  const token = req.cookies?.[SESSION_COOKIE_NAME];
  if (token) {
    try { viewerId = jwt.verify(token, process.env.JWT_SECRET).id; } catch { /* anonymous view */ }
  }

  try {
    const recipe = await prisma.recipe.findUnique({ where: { slug: req.params.slug }, select: { id: true, authorId: true, isPublic: true } });
    if (!recipe || !recipe.isPublic) return res.status(404).json({ error: "Recipe not found" });
    if (viewerId && viewerId === recipe.authorId) return res.json({ recorded: false });
    if (!viewerId && !visitorId) return res.status(400).json({ error: "Missing visitor id" });

    const since = new Date(Date.now() - 30 * 60 * 1000);
    const previousView = await prisma.recipeView.findFirst({
      where: {
        recipeId: recipe.id,
        viewedAt: { gte: since },
        ...(viewerId ? { viewerId } : { viewerId: null, visitorId }),
      },
      select: { id: true },
    });
    if (previousView) return res.json({ recorded: false });

    await prisma.recipeView.create({ data: { recipeId: recipe.id, viewerId, visitorId } });
    res.status(201).json({ recorded: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to record recipe view" });
  }
});

// PATCH /api/recipes/:slug/save
router.patch("/:slug/save", authenticate, async (req, res) => {
  try {
    const recipe = await prisma.recipe.findUnique({ where: { slug: req.params.slug }, select: { id: true } });
    if (!recipe) return res.status(404).json({ error: "Recipe not found" });
    const savedCategoryId = req.body.savedCategoryId == null ? null : Number(req.body.savedCategoryId);
    if (savedCategoryId !== null) {
      if (!Number.isInteger(savedCategoryId)) return res.status(400).json({ error: "Invalid category id" });
      const category = await prisma.savedCategory.findFirst({ where: { id: savedCategoryId, userId: req.user.id } });
      if (!category) return res.status(404).json({ error: "Saved category not found" });
    }
    const result = await prisma.savedRecipe.updateMany({
      where: { userId: req.user.id, recipeId: recipe.id },
      data: { savedCategoryId },
    });
    if (!result.count) return res.status(404).json({ error: "Saved recipe not found" });
    res.json({ ok: true, savedCategoryId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to move saved recipe" });
  }
});

// DELETE /api/recipes/:slug/save
router.delete("/:slug/save", authenticate, async (req, res) => {
  try {
    const recipe = await prisma.recipe.findUnique({ where: { slug: req.params.slug } });
    if (!recipe) return res.status(404).json({ error: "Recipe not found" });
    await prisma.savedRecipe.deleteMany({ where: { userId: req.user.id, recipeId: recipe.id } });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to unsave recipe" });
  }
});

// POST /api/recipes/:slug/like
router.post("/:slug/like", authenticate, likeRateLimit, async (req, res) => {
  try {
    const recipe = await prisma.recipe.findUnique({ where: { slug: req.params.slug } });
    if (!recipe) return res.status(404).json({ error: "Recipe not found" });
    await prisma.recipeLike.upsert({
      where: { userId_recipeId: { userId: req.user.id, recipeId: recipe.id } },
      update: {},
      create: { userId: req.user.id, recipeId: recipe.id },
    });
    const likeCount = await prisma.recipeLike.count({ where: { recipeId: recipe.id } });
    res.json({ likeCount });
    if (recipe.authorId && recipe.authorId !== req.user.id) {
      createNotification({ userId: recipe.authorId, actorId: req.user.id, type: "like", recipeId: recipe.id });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to like recipe" });
  }
});

// DELETE /api/recipes/:slug/like
router.delete("/:slug/like", authenticate, likeRateLimit, async (req, res) => {
  try {
    const recipe = await prisma.recipe.findUnique({ where: { slug: req.params.slug } });
    if (!recipe) return res.status(404).json({ error: "Recipe not found" });
    await prisma.recipeLike.deleteMany({ where: { userId: req.user.id, recipeId: recipe.id } });
    const likeCount = await prisma.recipeLike.count({ where: { recipeId: recipe.id } });
    res.json({ likeCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to unlike recipe" });
  }
});

export default router;
