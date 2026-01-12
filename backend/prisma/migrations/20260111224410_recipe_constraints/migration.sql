/*
  Warnings:

  - A unique constraint covering the columns `[recipeId,isMain]` on the table `RecipeImage` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[recipeId,language]` on the table `RecipeTranslation` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "RecipeImage_recipeId_isMain_key" ON "RecipeImage"("recipeId", "isMain");

-- CreateIndex
CREATE UNIQUE INDEX "RecipeTranslation_recipeId_language_key" ON "RecipeTranslation"("recipeId", "language");
