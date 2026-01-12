import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve frontend recipe images
app.use(
  "/images",
  express.static(path.join(__dirname, "../src/recipes"))
);


// --------------------------------------------------
// GET ALL RECIPES
// --------------------------------------------------
app.get("/api/recipes", async (req, res) => {
  const { lang = "fr", category } = req.query;

  try {
    const recipes = await prisma.recipe.findMany({
      where: {
        isPublic: true,
        ...(category && {
          category: { slug: category },
        }),
      },
      include: {
        category: true,
        images: {
          where: { isMain: true },
        },
        translations: {
          where: { language: lang },
        },
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
        category: {
          slug: r.category.slug,
          label: r.category.label,
        },
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
        translations: {
          where: { language: lang },
        },
      },
    });

    if (!recipe || recipe.translations.length === 0) {
      return res.status(404).json({ error: "Recipe not found" });
    }

    const t = recipe.translations[0];

    res.json({
      slug: recipe.slug,
      title: t.title,
      description: t.description,
      image: recipe.images.find((i) => i.isMain)?.url || null,
      category: {
        slug: recipe.category.slug,
        label: recipe.category.label,
      },
      info: recipe.info,
      tags: recipe.tags,
      ingredients: t.ingredients,
      instructions: t.instructions,
      nutrition: t.nutrition,
      tips: t.tips,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch recipe" });
  }
});

// --------------------------------------------------
app.listen(4000, () => {
  console.log("🚀 API running on http://localhost:4000");
});
