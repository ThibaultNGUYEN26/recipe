ALTER TABLE "Recipe" ADD COLUMN "originalLanguage" TEXT NOT NULL DEFAULT 'fr';

UPDATE "Recipe" AS recipe
SET "originalLanguage" = COALESCE(
  (
    SELECT translation."language"
    FROM "RecipeTranslation" AS translation
    WHERE translation."recipeId" = recipe."id"
    ORDER BY CASE WHEN translation."language" = 'fr' THEN 0 ELSE 1 END, translation."id"
    LIMIT 1
  ),
  'fr'
);
