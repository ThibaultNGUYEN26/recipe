import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ESM-safe dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to frontend recipes
const RECIPES_ROOT = path.resolve(__dirname, "../../src/recipes");

console.log("📁 Recipes root:", RECIPES_ROOT);

// ---------------------------------------------

function readJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

async function importRecipes() {
  console.log("📦 Importing recipes...");

  const categorySlugs = fs
    .readdirSync(RECIPES_ROOT)
    .filter((f) =>
      fs.statSync(path.join(RECIPES_ROOT, f)).isDirectory()
    );

  for (const categorySlug of categorySlugs) {
    console.log(`📂 Category: ${categorySlug}`);

    const category = await prisma.category.findUnique({
      where: { slug: categorySlug },
    });

    if (!category) {
      console.warn(`⚠️  Category not found in DB: ${categorySlug}`);
      continue;
    }

    const categoryPath = path.join(RECIPES_ROOT, categorySlug);

    const recipeSlugs = fs
      .readdirSync(categoryPath)
      .filter((f) =>
        fs.statSync(path.join(categoryPath, f)).isDirectory()
      );

    for (const recipeSlug of recipeSlugs) {
      console.log(`  🍽 ${recipeSlug}`);

      const recipePath = path.join(categoryPath, recipeSlug);

      // -----------------------------------------
      // RECIPE (base)
      // -----------------------------------------
      const recipe = await prisma.recipe.upsert({
        where: { slug: recipeSlug },
        update: {
          categoryId: category.id,
        },
        create: {
          slug: recipeSlug,
          categoryId: category.id,
          isPublic: true,
        },
      });

      // -----------------------------------------
      // IMAGE
      // -----------------------------------------
      const imageUrl = `/images/${categorySlug}/${recipeSlug}/${recipeSlug}.png`;

      await prisma.recipeImage.upsert({
        where: {
          recipeId_isMain: {
            recipeId: recipe.id,
            isMain: true,
          },
        },
        update: {
          url: imageUrl,
        },
        create: {
          recipeId: recipe.id,
          url: imageUrl,
          isMain: true,
        },
      });

      // -----------------------------------------
      // TRANSLATIONS
      // -----------------------------------------
      const files = fs
        .readdirSync(recipePath)
        .filter((f) => f.endsWith(".json"));

      for (const file of files) {
        const lang = file.endsWith(".fr.json") ? "fr" : "en";
        const data = readJSON(path.join(recipePath, file));

        // Translation (language-specific only)
        await prisma.recipeTranslation.upsert({
          where: {
            recipeId_language: {
              recipeId: recipe.id,
              language: lang,
            },
          },
          update: {
            title: data.name,
            description: data.description,
            ingredients: data.ingredients,
            instructions: data.instructions,
            nutrition: data.nutrition,
            tips: data.tips,
          },
          create: {
            recipeId: recipe.id,
            language: lang,
            title: data.name,
            description: data.description,
            ingredients: data.ingredients,
            instructions: data.instructions,
            nutrition: data.nutrition,
            tips: data.tips,
          },
        });

        // -----------------------------------------
        // SHARED RECIPE DATA (ONCE)
        // -----------------------------------------
        await prisma.recipe.update({
          where: { id: recipe.id },
          data: {
            info: data.info ?? undefined,
            tags: Array.isArray(data.tags) ? data.tags : undefined,
          },
        });
      }
    }
  }

  console.log("✅ Import finished");
}

importRecipes()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
