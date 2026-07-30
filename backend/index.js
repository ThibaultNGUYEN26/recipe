import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { PrismaClient } from "@prisma/client";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import { authenticate } from "./middleware/authenticate.js";

const app = express();
const prisma = new PrismaClient();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --------------------------------------------------
// FILE UPLOAD (multer)
// --------------------------------------------------

const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype);
    cb(ok ? null : new Error("Only jpeg/png/webp allowed"), ok);
  },
});

// --------------------------------------------------
// MIDDLEWARE
// --------------------------------------------------

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
  : ["http://localhost:5173"];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked: ${origin}`));
      }
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Static files
app.use("/uploads", express.static(uploadsDir));
app.use("/images", express.static(path.join(__dirname, "../src/recipes")));

// --------------------------------------------------
// GET ALL RECIPES
// --------------------------------------------------
app.get("/api/recipes", async (req, res) => {
  const { lang = "fr", category } = req.query;

  try {
    const recipes = await prisma.recipe.findMany({
      where: {
        isPublic: true,
        ...(category && { category: { slug: category } }),
      },
      include: {
        category: true,
        images: { where: { isMain: true } },
        translations: { where: { language: lang } },
        author: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = recipes.map((r) => {
      const t = r.translations[0];
      return {
        slug: r.slug,
        title: t?.title,
        description: t?.description,
        image: r.images[0]?.url || null,
        category: { slug: r.category.slug, label: r.category.label },
        authorId:     r.author?.id ?? null,
        authorName:   r.author?.name ?? null,
        authorAvatar: r.author?.avatarUrl ?? null,
      };
    });

    res.json(formatted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch recipes" });
  }
});

// --------------------------------------------------
// GET ONE RECIPE BY SLUG
// --------------------------------------------------
app.get("/api/recipes/:slug", async (req, res) => {
  const { slug } = req.params;
  const { lang = "fr" } = req.query;

  try {
    const recipe = await prisma.recipe.findUnique({
      where: { slug },
      include: {
        category: true,
        images: true,
        translations: { where: { language: lang } },
      },
    });

    if (!recipe || recipe.translations.length === 0) {
      return res.status(404).json({ error: "Recipe not found" });
    }

    const t = recipe.translations[0];

    // Rating aggregation
    const agg = await prisma.rating.aggregate({
      where: { recipeId: recipe.id },
      _avg: { score: true },
      _count: { score: true },
    });

    // My rating + saved status (optional auth via cookie)
    let myRating = null;
    let isSaved = false;
    const token = req.cookies?.token;
    if (token) {
      try {
        const jwtPayload = jwt.verify(token, process.env.JWT_SECRET);
        const [ratingRow, savedRow] = await Promise.all([
          prisma.rating.findUnique({ where: { userId_recipeId: { userId: jwtPayload.id, recipeId: recipe.id } } }),
          prisma.savedRecipe.findUnique({ where: { userId_recipeId: { userId: jwtPayload.id, recipeId: recipe.id } } }),
        ]);
        myRating = ratingRow?.score ?? null;
        isSaved = !!savedRow;
      } catch { /* invalid token, ignore */ }
    }

    res.json({
      slug: recipe.slug,
      title: t.title,
      description: t.description,
      image: recipe.images.find((i) => i.isMain)?.url || null,
      category: { slug: recipe.category.slug, label: recipe.category.label },
      info: recipe.info,
      tags: recipe.tags,
      ingredients: t.ingredients,
      instructions: t.instructions,
      nutrition: t.nutrition,
      tips: t.tips,
      authorId: recipe.authorId,
      avgRating: agg._avg.score,
      ratingCount: agg._count.score,
      myRating,
      isSaved,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch recipe" });
  }
});

// --------------------------------------------------
// GET ALL CATEGORIES
// --------------------------------------------------
app.get("/api/categories", async (_req, res) => {
  try {
    const categories = await prisma.category.findMany({ orderBy: { label: "asc" } });
    res.json(categories);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// --------------------------------------------------
// CREATE RECIPE
// --------------------------------------------------
app.post("/api/recipes", authenticate, upload.single("image"), async (req, res) => {
  const {
    slug, categoryId, isPublic = "true",
    info, tags, lang = "fr",
    title, description,
    ingredients, instructions, tips, nutrition,
  } = req.body;

  if (!slug || !categoryId || !title || !ingredients || !instructions) {
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.status(400).json({ error: "Missing required fields" });
  }

  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    const recipe = await prisma.$transaction(async (tx) => {
      const r = await tx.recipe.create({
        data: {
          slug,
          categoryId: parseInt(categoryId),
          isPublic: isPublic === "true",
          authorId: req.user.id,
          info: info ? JSON.parse(info) : null,
          tags: tags ? JSON.parse(tags) : null,
        },
      });

      await tx.recipeTranslation.create({
        data: {
          recipeId: r.id,
          language: lang,
          title,
          description: description || null,
          ingredients: JSON.parse(ingredients),
          instructions: JSON.parse(instructions),
          tips: tips ? JSON.parse(tips) : null,
          nutrition: nutrition ? JSON.parse(nutrition) : null,
        },
      });

      if (imageUrl) {
        await tx.recipeImage.create({
          data: { recipeId: r.id, url: imageUrl, isMain: true },
        });
      }

      return r;
    });

    res.status(201).json({ slug: recipe.slug, id: recipe.id });
  } catch (err) {
    if (req.file) fs.unlink(req.file.path, () => {});
    console.error(err);
    if (err.code === "P2002") {
      return res.status(409).json({ error: "Ce slug est déjà utilisé" });
    }
    res.status(500).json({ error: "Failed to create recipe" });
  }
});

// --------------------------------------------------
// MY RECIPES
// --------------------------------------------------
app.get("/api/my-recipes", authenticate, async (req, res) => {
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

    const formatted = recipes.map((r) => {
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
    });

    res.json(formatted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch your recipes" });
  }
});

app.delete("/api/recipes/:slug", authenticate, async (req, res) => {
  const { slug } = req.params;

  try {
    const recipe = await prisma.recipe.findUnique({ where: { slug } });
    if (!recipe) return res.status(404).json({ error: "Recipe not found" });
    if (recipe.authorId !== req.user.id) return res.status(403).json({ error: "Not your recipe" });

    await prisma.recipe.delete({ where: { slug } });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete recipe" });
  }
});

// --------------------------------------------------
// SOCIAL — PROFILES
// --------------------------------------------------

app.get("/api/users", async (req, res) => {
  const { q = "" } = req.query;
  try {
    const users = await prisma.user.findMany({
      where: q ? { name: { contains: q, mode: "insensitive" } } : undefined,
      select: { id: true, name: true, avatarUrl: true },
      take: 20,
    });
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to search users" });
  }
});

app.get("/api/users/me/saved", authenticate, async (req, res) => {
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

    const formatted = saved.map(({ recipe: r }) => {
      const t = r.translations[0];
      return {
        slug: r.slug,
        title: t?.title,
        description: t?.description,
        image: r.images[0]?.url || null,
        category: { slug: r.category.slug, label: r.category.label },
      };
    });
    res.json(formatted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch saved recipes" });
  }
});

app.patch("/api/users/me", authenticate, upload.single("avatar"), async (req, res) => {
  const { name, bio } = req.body;
  const avatarUrl = req.file ? `/uploads/${req.file.filename}` : undefined;

  try {
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(name !== undefined && { name }),
        ...(bio !== undefined && { bio }),
        ...(avatarUrl !== undefined && { avatarUrl }),
      },
      select: { id: true, name: true, email: true, bio: true, avatarUrl: true },
    });
    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

app.get("/api/users/:id", async (req, res) => {
  const userId = parseInt(req.params.id);
  if (isNaN(userId)) return res.status(400).json({ error: "Invalid user id" });

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, bio: true, avatarUrl: true, createdAt: true },
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
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

app.get("/api/users/:id/recipes", async (req, res) => {
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
    res.status(500).json({ error: "Failed to fetch user recipes" });
  }
});

// --------------------------------------------------
// SOCIAL — FOLLOW
// --------------------------------------------------

app.post("/api/users/:id/follow", authenticate, async (req, res) => {
  const followingId = parseInt(req.params.id);
  if (followingId === req.user.id) return res.status(400).json({ error: "Cannot follow yourself" });

  try {
    await prisma.follow.create({ data: { followerId: req.user.id, followingId } });
    res.status(201).json({ ok: true });
  } catch (err) {
    if (err.code === "P2002") return res.status(409).json({ error: "Already following" });
    console.error(err);
    res.status(500).json({ error: "Failed to follow" });
  }
});

app.delete("/api/users/:id/follow", authenticate, async (req, res) => {
  const followingId = parseInt(req.params.id);
  try {
    await prisma.follow.deleteMany({ where: { followerId: req.user.id, followingId } });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to unfollow" });
  }
});

app.get("/api/users/:id/followers", async (req, res) => {
  const userId = parseInt(req.params.id);
  try {
    const follows = await prisma.follow.findMany({
      where: { followingId: userId },
      include: { follower: { select: { id: true, name: true, avatarUrl: true } } },
    });
    res.json(follows.map((f) => f.follower));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch followers" });
  }
});

app.get("/api/users/:id/following", async (req, res) => {
  const userId = parseInt(req.params.id);
  try {
    const follows = await prisma.follow.findMany({
      where: { followerId: userId },
      include: { following: { select: { id: true, name: true, avatarUrl: true } } },
    });
    res.json(follows.map((f) => f.following));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch following" });
  }
});

// --------------------------------------------------
// SOCIAL — RATINGS
// --------------------------------------------------

app.post("/api/recipes/:slug/rate", authenticate, async (req, res) => {
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
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to rate recipe" });
  }
});

// --------------------------------------------------
// SOCIAL — SAVE
// --------------------------------------------------

app.post("/api/recipes/:slug/save", authenticate, async (req, res) => {
  try {
    const recipe = await prisma.recipe.findUnique({ where: { slug: req.params.slug } });
    if (!recipe) return res.status(404).json({ error: "Recipe not found" });

    await prisma.savedRecipe.create({ data: { userId: req.user.id, recipeId: recipe.id } });
    res.status(201).json({ ok: true });
  } catch (err) {
    if (err.code === "P2002") return res.status(409).json({ error: "Already saved" });
    console.error(err);
    res.status(500).json({ error: "Failed to save recipe" });
  }
});

app.delete("/api/recipes/:slug/save", authenticate, async (req, res) => {
  try {
    const recipe = await prisma.recipe.findUnique({ where: { slug: req.params.slug } });
    if (!recipe) return res.status(404).json({ error: "Recipe not found" });

    await prisma.savedRecipe.deleteMany({ where: { userId: req.user.id, recipeId: recipe.id } });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to unsave recipe" });
  }
});

// --------------------------------------------------
// AUTH ROUTES
// --------------------------------------------------

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

app.post("/api/auth/register", async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: "Email already in use" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, passwordHash, name: name || null },
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("token", token, COOKIE_OPTIONS);
    res.status(201).json({ user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Registration failed" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("token", token, COOKIE_OPTIONS);
    res.json({ user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});

app.post("/api/auth/logout", (_req, res) => {
  res.clearCookie("token", COOKIE_OPTIONS);
  res.json({ ok: true });
});

app.get("/api/auth/me", authenticate, (req, res) => {
  res.json({ user: req.user });
});

// --------------------------------------------------
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 API running on port ${PORT}`);
});
