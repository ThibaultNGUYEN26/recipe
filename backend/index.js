import "dotenv/config";
import process from "node:process";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";

import authRouter from "./routes/auth.js";
import recipesRouter from "./routes/recipes.js";
import usersRouter from "./routes/users.js";
import commentsRouter from "./routes/comments.js";
import notificationsRouter from "./routes/notifications.js";
import mediaRouter from "./routes/media.js";
import verificationsRouter from "./routes/verifications.js";
import { uploadsDir } from "./lib/upload.js";
import { startMediaCleanup } from "./lib/media/cleanup.js";
import { cleanupUnreferencedLegacyUploads } from "./lib/media/legacyCleanup.js";
import { assertMediaInfrastructureReady } from "./lib/media/preflight.js";
import { selectRecipeTranslation } from "./lib/translations.js";

export const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
  : ["http://localhost:5173"];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) cb(null, true);
    else cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
  exposedHeaders: ["Authorization"],
}));
app.use(express.json());
app.use(cookieParser());

app.use("/uploads", express.static(uploadsDir));
app.use("/images", express.static(path.join(__dirname, "../src/recipes")));

app.use("/api/auth", authRouter);
app.use("/api/recipes", recipesRouter);
app.use("/api/users", usersRouter);
app.use("/api/recipes/:slug/comments", commentsRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/media", mediaRouter);
app.use("/api/verifications", verificationsRouter);
app.get("/api/categories", async (_req, res) => {
  const { prisma } = await import("./lib/prisma.js");
  try {
    const categories = await prisma.category.findMany({ orderBy: { label: "asc" } });
    res.json(categories);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});
app.post("/api/categories", async (req, res) => {
  const { prisma } = await import("./lib/prisma.js");
  const { authenticate } = await import("./middleware/authenticate.js");
  authenticate(req, res, async () => {
    const { label } = req.body;
    if (!label?.trim()) return res.status(400).json({ error: "Label is required" });
    const slug = label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    try {
      const category = await prisma.category.create({ data: { label: label.trim(), slug } });
      res.status(201).json(category);
    } catch (err) {
      if (err.code === "P2002") return res.status(409).json({ error: "Category already exists" });
      res.status(500).json({ error: err.message || "Failed to create category" });
    }
  });
});
// Legacy alias kept for backward-compat
app.use("/api/my-recipes", async (req, res) => {
  const { prisma } = await import("./lib/prisma.js");
  const { authenticate } = await import("./middleware/authenticate.js");
  authenticate(req, res, async () => {
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
        return { slug: r.slug, title: t?.title, description: t?.description, image: r.images[0]?.url || null, category: { slug: r.category.slug, label: r.category.label }, isPublic: r.isPublic, createdAt: r.createdAt, contentLanguage: selected.contentLanguage, originalLanguage: selected.originalLanguage, availableLanguages: selected.availableLanguages, isTranslated: selected.isTranslated };
      }));
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch your recipes" });
    }
  });
});

if (process.env.NODE_ENV !== "test") {
  const PORT = process.env.PORT || 4000;
  await assertMediaInfrastructureReady();
  await cleanupUnreferencedLegacyUploads().catch((error) => console.error("Legacy upload cleanup failed", error));
  app.listen(PORT, () => console.log(`🚀 API running on port ${PORT}`));
  startMediaCleanup();
}
