import { Router } from "express";
import jwt from "jsonwebtoken";
import fs from "fs";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/authenticate.js";
import { recipeUpload } from "../lib/upload.js";
import { createNotification } from "../lib/notify.js";

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
router.get("/", async (req, res) => {
  const { lang = "fr", category } = req.query;
  try {
    const recipes = await prisma.recipe.findMany({
      where: { isPublic: true, ...(category && { category: { slug: category } }) },
      include: {
        category: true,
        images: { where: { isMain: true } },
        translations: { where: { language: lang } },
        author: { select: { id: true, name: true, avatarUrl: true } },
        ratings: { select: { score: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = recipes.map((r) => {
      const t = r.translations[0];
      const avgRating = r.ratings.length ? r.ratings.reduce((s, x) => s + x.score, 0) / r.ratings.length : null;
      return {
        slug: r.slug,
        title: t?.title,
        description: t?.description,
        image: r.images[0]?.url || null,
        category: { slug: r.category.slug, label: r.category.label },
        info: r.info,
        tags: r.tags,
        authorId: r.author?.id ?? null,
        authorName: r.author?.name ?? null,
        authorAvatar: r.author?.avatarUrl ?? null,
        avgRating,
        ratingCount: r.ratings.length,
      };
    });

    res.json(formatted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to fetch recipes" });
  }
});

// GET /api/recipes/:slug
router.get("/:slug", async (req, res) => {
  const { slug } = req.params;
  const { lang = "fr" } = req.query;

  try {
    const recipe = await prisma.recipe.findUnique({
      where: { slug },
      include: {
        category: true,
        images: true,
        translations: { where: { language: lang } },
        author: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    if (!recipe || recipe.translations.length === 0) return res.status(404).json({ error: "Recipe not found" });

    const t = recipe.translations[0];
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
    let isLiked = false;
    const token = req.cookies?.token;
    if (token) {
      try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        const [ratingRow, savedRow] = await Promise.all([
          prisma.rating.findUnique({ where: { userId_recipeId: { userId: payload.id, recipeId: recipe.id } } }),
          prisma.savedRecipe.findUnique({ where: { userId_recipeId: { userId: payload.id, recipeId: recipe.id } } }),
        ]);
        myRating = ratingRow?.score ?? null;
        isSaved = !!savedRow;
        isLiked = myRating !== null;
      } catch { /* invalid token */ }
    }

    res.json({
      slug: recipe.slug,
      title: t.title,
      description: t.description,
      image: recipe.images.find((i) => i.isMain)?.url || null,
      category: { slug: recipe.category.slug, label: recipe.category.label },
      info: recipe.info,
      tags: recipe.tags,
      videoUrl: recipe.videoUrl,
      ingredients: t.ingredients,
      instructions: t.instructions,
      nutrition: t.nutrition,
      tips: t.tips,
      authorId: recipe.authorId,
      authorName: recipe.author?.name ?? null,
      authorAvatar: recipe.author?.avatarUrl ?? null,
      avgRating: agg._avg.score,
      ratingCount: agg._count.score,
      ratingDistribution,
      myRating,
      isSaved,
      isLiked,
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
    info, tags,
    translations: rawTranslations,
    // single-language fallback
    lang = "fr", title, description, ingredients, instructions, tips, nutrition,
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

  const imageUrl = imageFile ? `/uploads/${imageFile.filename}` : null;
  const videoUrl = videoFile ? `/uploads/${videoFile.filename}` : null;

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

    const recipe = await prisma.$transaction(async (tx) => {
      const r = await tx.recipe.create({
        data: {
          slug,
          categoryId: parseInt(categoryId),
          isPublic: isPublic === "true",
          authorId: req.user.id,
          info: info ? JSON.parse(info) : null,
          tags: tags ? JSON.parse(tags) : null,
          videoUrl,
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
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to delete recipe" });
  }
});

// POST /api/recipes/:slug/rate
router.post("/:slug/rate", authenticate, async (req, res) => {
  const { score } = req.body;
  if (!score || score < 1 || score > 5) return res.status(400).json({ error: "Score must be 1–5" });

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

// POST /api/recipes/:slug/save
router.post("/:slug/save", authenticate, async (req, res) => {
  try {
    const recipe = await prisma.recipe.findUnique({ where: { slug: req.params.slug } });
    if (!recipe) return res.status(404).json({ error: "Recipe not found" });
    await prisma.savedRecipe.create({ data: { userId: req.user.id, recipeId: recipe.id } });
    res.status(201).json({ ok: true });
  } catch (err) {
    if (err.code === "P2002") return res.status(409).json({ error: "Already saved" });
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to save recipe" });
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

export default router;
