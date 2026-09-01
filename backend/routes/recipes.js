import { Router } from "express";
import jwt from "jsonwebtoken";
import { SESSION_COOKIE_NAME } from "../lib/session.js";
import fs from "fs";
import process from "node:process";
import { prisma } from "../lib/prisma.js";
import { authenticate, optionalAuthenticate } from "../middleware/authenticate.js";
import { makePhotoUpload, recipeUpload, uploadsDir } from "../lib/upload.js";
import { createNotification } from "../lib/notify.js";
import { diversifyRecommendations, scoreRecommendation } from "../lib/recommendations.js";
import { normalizeLanguage, selectRecipeTranslation } from "../lib/translations.js";
import { fetchTikTokImport, validateTikTokUrl } from "../lib/tiktokImport.js";
import { broadcastRecipeEvent, broadcastRecipeLikeEvent, broadcastRecipeStatsEvent } from "../lib/ws.js";
import { likeRateLimit } from "../middleware/rateLimit.js";
import { blockedUserIds, usersAreBlocked } from "../lib/blocks.js";
import { normalizeMakeInput } from "../lib/makes.js";
import { normalizeTags } from "../lib/contentNormalization.js";

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

function hasRequiredRecipeTimes(info) {
  const minutes = (value) => {
    const match = String(value ?? "").match(/-?\d+(?:\.\d+)?/);
    return match ? Number.parseFloat(match[0]) : Number.NaN;
  };
  const prepMinutes = minutes(info?.prepTime);
  const cookMinutes = minutes(info?.cookTime);
  return prepMinutes > 0 && Number.isFinite(cookMinutes) && cookMinutes >= 0;
}

function normalizeRecipeTimes(info) {
  if (!hasRequiredRecipeTimes(info)) return null;
  const minutes = (value) => Number.parseFloat(String(value ?? "").match(/-?\d+(?:\.\d+)?/)?.[0] ?? "NaN");
  const prepMinutes = minutes(info.prepTime);
  const cookMinutes = minutes(info.cookTime);
  const hasRestTime = info.restTime !== undefined && info.restTime !== null && info.restTime !== "";
  const restMinutes = hasRestTime ? minutes(info.restTime) : 0;
  if (!Number.isFinite(restMinutes) || restMinutes < 0) return null;
  return {
    ...info,
    prepTime: `${prepMinutes} min`,
    cookTime: `${cookMinutes} min`,
    ...(hasRestTime ? { restTime: `${restMinutes} min` } : {}),
    totalTime: `${prepMinutes + cookMinutes + restMinutes} min`,
  };
}

function normalizeFocalPoint(value) {
  const point = Number.parseFloat(value);
  return Number.isFinite(point) ? Math.min(100, Math.max(0, point)) : 50;
}

function normalizeCountryCode(value) {
  const code = String(value ?? "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : null;
}

// GET /api/recipes
router.get("/", optionalAuthenticate, async (req, res) => {
  const { lang = "fr", category, country } = req.query;
  const originCountry = normalizeCountryCode(country);
  try {
    const excludedAuthors = await blockedUserIds(req.user?.id);
    const recipes = await prisma.recipe.findMany({
      where: { isPublic: true, ...(excludedAuthors.length && { authorId: { notIn: excludedAuthors } }), ...(category && { category: { slug: category } }), ...(originCountry && { originCountry }) },
      include: {
        category: true,
        images: { where: { isMain: true } },
        translations: true,
        author: { select: { id: true, username: true, name: true, avatarUrl: true, isVerified: true, isChefVerified: true } },
        ratings: { select: { score: true } },
        _count: { select: { likes: true, comments: true, makes: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    const followedAuthorIds = new Set(req.user
      ? (await prisma.follow.findMany({
          where: { followerId: req.user.id, followingId: { in: recipes.map((recipe) => recipe.authorId).filter(Boolean) } },
          select: { followingId: true },
        })).map((follow) => follow.followingId)
      : []);
    const likedRecipeIds = new Set(req.user
      ? (await prisma.recipeLike.findMany({
          where: { userId: req.user.id, recipeId: { in: recipes.map((recipe) => recipe.id) } },
          select: { recipeId: true },
        })).map((like) => like.recipeId)
      : []);

    const formatted = recipes.map((r) => {
      const selected = selectRecipeTranslation(r, lang);
      const t = selected.translation;
      const avgRating = r.ratings.length ? r.ratings.reduce((s, x) => s + x.score, 0) / r.ratings.length : null;
      return {
        slug: r.slug,
        title: t?.title,
        description: t?.description,
        image: r.images[0]?.url || r.sourceThumbnailUrl || null,
        originCountry: r.originCountry,
        category: { slug: r.category.slug, label: r.category.label },
        info: r.info,
        tags: r.tags,
        authorId: r.author?.id ?? null,
        authorUsername: r.author?.username ?? null,
        authorIsVerified: r.author?.isVerified ?? false,
        authorIsChefVerified: r.author?.isChefVerified ?? false,
        authorName: r.author?.name ?? null,
        authorAvatar: r.author?.avatarUrl ?? null,
        isFollowing: followedAuthorIds.has(r.authorId),
        isLiked: likedRecipeIds.has(r.id),
        avgRating,
        ratingCount: r.ratings.length,
        likeCount: r._count.likes,
        commentCount: r._count.comments,
        makeCount: r._count.makes,
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
    const [recipes, saved, rated, viewed, follows, likedRecipes] = await Promise.all([
      prisma.recipe.findMany({
        where: { isPublic: true, ...(userId ? { authorId: { not: userId, notIn: excludedAuthors } } : {}) },
        include: {
          category: true,
          images: { where: { isMain: true }, take: 1 },
          translations: true,
          author: { select: { id: true, username: true, name: true, avatarUrl: true, isVerified: true, isChefVerified: true, _count: { select: { followers: true } } } },
          ratings: { select: { score: true } },
          savedBy: { where: { savedAt: { gte: recentFrom } }, select: { userId: true } },
          likes: { where: { createdAt: { gte: recentFrom } }, select: { id: true } },
          comments: { where: { createdAt: { gte: recentFrom } }, select: { id: true } },
          makes: { where: { createdAt: { gte: recentFrom } }, select: { id: true } },
          views: { where: { viewedAt: { gte: recentFrom } }, select: { id: true } },
          _count: { select: { savedBy: true, comments: true, likes: true, makes: true } },
        },
      }),
      userId ? prisma.savedRecipe.findMany({ where: { userId }, select: { recipeId: true, recipe: { select: { category: { select: { slug: true } }, tags: true } } } }) : [],
      userId ? prisma.rating.findMany({ where: { userId, score: { gte: 4 } }, select: { recipeId: true, score: true, recipe: { select: { category: { select: { slug: true } }, tags: true } } } }) : [],
      userId ? prisma.recipeView.findMany({ where: { viewerId: userId, viewedAt: { gte: recentFrom } }, select: { recipeId: true, recipe: { select: { category: { select: { slug: true } }, tags: true } } } }) : [],
      userId ? prisma.follow.findMany({ where: { followerId: userId }, select: { followingId: true } }) : [],
      userId ? prisma.recipeLike.findMany({ where: { userId }, select: { recipeId: true } }) : [],
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
    const likedRecipeIds = new Set(likedRecipes.map((item) => item.recipeId));
    const preferences = {
      categories,
      tags,
      language: normalizeLanguage(lang),
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
        saveCount: recipe._count.savedBy,
        commentCount: recipe._count.comments,
        likeCount: recipe._count.likes,
        makeCount: recipe._count.makes,
        recentSaveCount: recipe.savedBy.length,
        recentCommentCount: recipe.comments.length,
        recentLikeCount: recipe.likes.length,
        recentMakeCount: recipe.makes.length,
        recentViews: recipe.views.length,
        followerCount: recipe.author?._count.followers ?? 0,
        categorySlug: recipe.category.slug,
        categoryLabel: recipe.category.label,
        originalLanguage: recipe.originalLanguage,
        availableLanguages: recipe.translations.map((translation) => normalizeLanguage(translation.language)),
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
        commentCount: recipe._count.comments,
        makeCount: recipe._count.makes,
        score: ranking.score,
        recommendationReason: ranking.reasonCode,
        recommendationReasonValue: ranking.reasonValue,
        slug: recipe.slug,
        title: translation.title,
        description: translation.description,
        image: recipe.images[0]?.url || recipe.sourceThumbnailUrl || null,
        originCountry: recipe.originCountry,
        category: { slug: recipe.category.slug, label: recipe.category.label },
        info: recipe.info,
        authorId: recipe.author?.id ?? null,
        authorUsername: recipe.author?.username ?? null,
        authorIsVerified: recipe.author?.isVerified ?? false,
        authorIsChefVerified: recipe.author?.isChefVerified ?? false,
        authorName: recipe.author?.name ?? null,
        authorAvatar: recipe.author?.avatarUrl ?? null,
        isFollowing: preferences.following.has(recipe.authorId),
        isLiked: likedRecipeIds.has(recipe.id),
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
    const trendingScore = (recipe) => recipe.recentSaveCount * 3 + recipe.recentCommentCount * 2 + recipe.recentLikeCount + recipe.recentMakeCount * 2 + recipe.recentViews * 0.25;
    const trending = [...formatted].sort((a, b) => trendingScore(b) - trendingScore(a) || new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 20).map((recipe) => ({
      ...recipe,
      recommendationReason: trendingScore(recipe) >= 5 ? 'trending' : recipe.recommendationReason,
    }));
    const following = formatted.filter((recipe) => preferences.following.has(recipe.authorId)).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map((recipe) => ({ ...recipe, recommendationReason: 'follow' }));
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
        author: { select: { id: true, username: true, name: true, avatarUrl: true, isVerified: true, isChefVerified: true } },
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
        const [ratingRow, savedRow, likeRow] = await Promise.all([
          prisma.rating.findUnique({ where: { userId_recipeId: { userId: payload.id, recipeId: recipe.id } } }),
          prisma.savedRecipe.findUnique({ where: { userId_recipeId: { userId: payload.id, recipeId: recipe.id } } }),
          prisma.recipeLike.findUnique({ where: { userId_recipeId: { userId: payload.id, recipeId: recipe.id } } }),
        ]);
        myRating = ratingRow?.score ?? null;
        isSaved = !!savedRow;
        savedCategoryId = savedRow?.savedCategoryId ?? null;
        isLiked = !!likeRow;
      } catch { /* invalid token */ }
    }

    const [likeCount, commentCount, makeCount] = await Promise.all([
      prisma.recipeLike.count({ where: { recipeId: recipe.id } }),
      prisma.comment.count({ where: { recipeId: recipe.id } }),
      prisma.recipeMake.count({ where: { recipeId: recipe.id } }),
    ]);

    res.json({
      slug: recipe.slug,
      title: t.title,
      description: t.description,
      image: recipe.images.find((i) => i.isMain)?.url || recipe.sourceThumbnailUrl || null,
      imageFocalPoint: recipe.images.some((i) => i.isMain)
        ? {
            x: recipe.images.find((i) => i.isMain).focalX,
            y: recipe.images.find((i) => i.isMain).focalY,
          }
        : { x: 50, y: 50 },
      category: { slug: recipe.category.slug, label: recipe.category.label },
      originCountry: recipe.originCountry,
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
      authorIsChefVerified: recipe.author?.isChefVerified ?? false,
      authorName: recipe.author?.name ?? null,
      authorAvatar: recipe.author?.avatarUrl ?? null,
      avgRating: agg._avg.score,
      ratingCount: agg._count.score,
      ratingDistribution,
      myRating,
      isSaved,
      savedCategoryId,
      isLiked,
      likeCount,
      commentCount,
      makeCount,
      contentLanguage: selected.contentLanguage,
      originalLanguage: selected.originalLanguage,
      availableLanguages: selected.availableLanguages,
      isTranslated: selected.isTranslated,
      isPublic: recipe.isPublic,
      createdAt: recipe.createdAt,
      updatedAt: recipe.updatedAt,
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
    info, tags, sourcePlatform, sourceUrl, sourceAuthor, sourceThumbnailUrl, imageFocalX, imageFocalY,
    translations: rawTranslations,
    // single-language fallback
    lang = "fr", originalLanguage: rawOriginalLanguage, originCountry: rawOriginCountry, title, description, ingredients, instructions, tips, nutrition,
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

  const originCountry = normalizeCountryCode(rawOriginCountry);
  if (rawOriginCountry && !originCountry) {
    removeUploadedFiles();
    return res.status(400).json({ error: "Invalid country code" });
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
    const parsedInfo = info ? normalizeRecipeTimes(JSON.parse(info)) : null;
    if (!parsedInfo) {
      removeUploadedFiles();
      return res.status(400).json({ error: "Preparation time must be greater than zero and cooking time cannot be negative" });
    }
    const parsedTags = tags ? normalizeTags(JSON.parse(tags)) : null;

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
          originCountry,
          categoryId: parseInt(categoryId),
          isPublic: isPublic === "true",
          authorId: req.user.id,
          info: parsedInfo,
          tags: parsedTags,
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
        await tx.recipeImage.create({
          data: {
            recipeId: r.id,
            url: imageUrl,
            isMain: true,
            focalX: normalizeFocalPoint(imageFocalX),
            focalY: normalizeFocalPoint(imageFocalY),
          },
        });
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

    const { categoryId, info, tags, originalLanguage: rawOriginalLanguage, originCountry: rawOriginCountry, isPublic, imageFocalX, imageFocalY } = req.body;
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

    const parsedInfo = info ? normalizeRecipeTimes(JSON.parse(info)) : null;
    if (info && !parsedInfo) {
      removeUploadedFiles();
      return res.status(400).json({ error: "Preparation time must be greater than zero and cooking time cannot be negative" });
    }
    const parsedTags = tags ? normalizeTags(JSON.parse(tags)) : null;
    const originCountry = normalizeCountryCode(rawOriginCountry);
    if (rawOriginCountry && !originCountry) {
      removeUploadedFiles();
      return res.status(400).json({ error: "Invalid country code" });
    }

    await prisma.$transaction(async (tx) => {
      await tx.recipe.update({
        where: { slug },
        data: {
          ...(categoryId ? { categoryId: parseInt(categoryId) } : {}),
          ...(info ? { info: parsedInfo } : {}),
          ...(tags ? { tags: parsedTags } : {}),
          ...(rawOriginalLanguage ? { originalLanguage: normalizeLanguage(rawOriginalLanguage) } : {}),
          ...(rawOriginCountry !== undefined ? { originCountry } : {}),
          ...(isPublic !== undefined ? { isPublic: isPublic === "true" } : {}),
          ...(newVideoUrl !== undefined ? { videoUrl: newVideoUrl } : {}),
        },
      });

      if (newImageUrl) {
        const existing = recipe.images[0];
        if (existing) {
          await tx.recipeImage.update({
            where: { id: existing.id },
            data: {
              url: newImageUrl,
              focalX: normalizeFocalPoint(imageFocalX),
              focalY: normalizeFocalPoint(imageFocalY),
            },
          });
          if (existing.url.startsWith("/uploads/")) {
            fs.unlink(`${process.env.UPLOAD_DIR || "uploads"}/${existing.url.replace("/uploads/", "")}`, () => {});
          }
        } else {
          await tx.recipeImage.create({
            data: {
              recipeId: recipe.id,
              url: newImageUrl,
              isMain: true,
              focalX: normalizeFocalPoint(imageFocalX),
              focalY: normalizeFocalPoint(imageFocalY),
            },
          });
        }
      } else if (recipe.images[0] && (imageFocalX !== undefined || imageFocalY !== undefined)) {
        await tx.recipeImage.update({
          where: { id: recipe.images[0].id },
          data: {
            focalX: normalizeFocalPoint(imageFocalX ?? recipe.images[0].focalX),
            focalY: normalizeFocalPoint(imageFocalY ?? recipe.images[0].focalY),
          },
        });
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
    broadcastRecipeStatsEvent(recipe.slug, { avgRating: agg._avg.score, ratingCount: agg._count.score, interaction: 'rating' });
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
    res.json({ likeCount, isLiked: true });
    broadcastRecipeLikeEvent(recipe.slug, likeCount);
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
    res.json({ likeCount, isLiked: false });
    broadcastRecipeLikeEvent(recipe.slug, likeCount);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to unlike recipe" });
  }
});

const formatMake = (entry) => ({
  id: entry.id,
  rating: entry.rating,
  note: entry.note,
  changes: entry.changes,
  imageUrl: entry.imageUrl,
  createdAt: entry.createdAt,
  updatedAt: entry.updatedAt,
  author: {
    id: entry.user.id,
    username: entry.user.username,
    name: entry.user.name,
    avatarUrl: entry.user.avatarUrl,
    isVerified: entry.user.isVerified,
  },
});

// GET /api/recipes/:slug/makes
router.get("/:slug/makes", optionalAuthenticate, async (req, res) => {
  try {
    const recipe = await prisma.recipe.findUnique({ where: { slug: req.params.slug }, select: { id: true } });
    if (!recipe) return res.status(404).json({ error: "Recipe not found" });
    const excludedUsers = await blockedUserIds(req.user?.id);
    const entries = await prisma.recipeMake.findMany({
      where: { recipeId: recipe.id, ...(excludedUsers.length && { userId: { notIn: excludedUsers } }) },
      include: { user: { select: { id: true, username: true, name: true, avatarUrl: true, isVerified: true } } },
      orderBy: { createdAt: "desc" },
    });
    const myEntry = req.user ? entries.find((entry) => entry.userId === req.user.id) : null;
    res.json({
      count: entries.length,
      entries: entries.map(formatMake),
      myEntry: myEntry ? formatMake(myEntry) : null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to fetch community makes" });
  }
});

// POST /api/recipes/:slug/makes — mark a recipe as made, or update the user's entry.
router.post("/:slug/makes", authenticate, (req, res, next) => {
  makePhotoUpload.single("photo")(req, res, (err) => {
    if (!err) return next();
    const message = err.code === "LIMIT_FILE_SIZE" ? "Photo must be under 5 MB" : err.message;
    return res.status(400).json({ error: message });
  });
}, async (req, res) => {
  const uploadedPath = req.file?.path;
  try {
    const recipe = await prisma.recipe.findUnique({ where: { slug: req.params.slug }, select: { id: true, authorId: true } });
    if (!recipe) {
      if (uploadedPath) fs.unlink(uploadedPath, () => {});
      return res.status(404).json({ error: "Recipe not found" });
    }
    if (recipe.authorId && await usersAreBlocked(req.user.id, recipe.authorId)) {
      if (uploadedPath) fs.unlink(uploadedPath, () => {});
      return res.status(403).json({ error: "This interaction is not allowed" });
    }

    const input = normalizeMakeInput(req.body);
    const existing = await prisma.recipeMake.findUnique({
      where: { userId_recipeId: { userId: req.user.id, recipeId: recipe.id } },
    });
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : existing?.imageUrl ?? null;
    const entry = await prisma.recipeMake.upsert({
      where: { userId_recipeId: { userId: req.user.id, recipeId: recipe.id } },
      update: { ...input, imageUrl },
      create: { userId: req.user.id, recipeId: recipe.id, ...input, imageUrl },
      include: { user: { select: { id: true, username: true, name: true, avatarUrl: true, isVerified: true } } },
    });

    if (req.file && existing?.imageUrl?.startsWith("/uploads/")) {
      fs.unlink(`${uploadsDir}/${existing.imageUrl.slice("/uploads/".length)}`, () => {});
    }
    const count = await prisma.recipeMake.count({ where: { recipeId: recipe.id } });
    res.status(existing ? 200 : 201).json({ entry: formatMake(entry), count });
    broadcastRecipeStatsEvent(req.params.slug, { makeCount: count, interaction: 'makes' });
    if (!existing && recipe.authorId && recipe.authorId !== req.user.id) {
      createNotification({ userId: recipe.authorId, actorId: req.user.id, type: "made_it", recipeId: recipe.id });
    }
  } catch (err) {
    if (uploadedPath) fs.unlink(uploadedPath, () => {});
    console.error(err);
    res.status(err.status || 500).json({ error: err.message || "Failed to save your make" });
  }
});

// DELETE /api/recipes/:slug/makes
router.delete("/:slug/makes", authenticate, async (req, res) => {
  try {
    const recipe = await prisma.recipe.findUnique({ where: { slug: req.params.slug }, select: { id: true } });
    if (!recipe) return res.status(404).json({ error: "Recipe not found" });
    const entry = await prisma.recipeMake.findUnique({ where: { userId_recipeId: { userId: req.user.id, recipeId: recipe.id } } });
    if (entry) await prisma.recipeMake.delete({ where: { id: entry.id } });
    if (entry?.imageUrl?.startsWith("/uploads/")) fs.unlink(`${uploadsDir}/${entry.imageUrl.slice("/uploads/".length)}`, () => {});
    const count = await prisma.recipeMake.count({ where: { recipeId: recipe.id } });
    res.json({ count });
    broadcastRecipeStatsEvent(req.params.slug, { makeCount: count, interaction: 'makes' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to remove your make" });
  }
});

export default router;
