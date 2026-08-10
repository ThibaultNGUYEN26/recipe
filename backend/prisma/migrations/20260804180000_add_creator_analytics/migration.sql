-- Record recipe impressions and the recipe that led to a creator follow.
ALTER TABLE "Follow" ADD COLUMN "sourceRecipeId" INTEGER;

CREATE TABLE "RecipeView" (
    "id" SERIAL NOT NULL,
    "recipeId" INTEGER NOT NULL,
    "viewerId" INTEGER,
    "visitorId" TEXT,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RecipeView_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RecipeView_recipeId_viewedAt_idx" ON "RecipeView"("recipeId", "viewedAt");
CREATE INDEX "RecipeView_viewerId_viewedAt_idx" ON "RecipeView"("viewerId", "viewedAt");
CREATE INDEX "Follow_followingId_createdAt_idx" ON "Follow"("followingId", "createdAt");
CREATE INDEX "Follow_sourceRecipeId_idx" ON "Follow"("sourceRecipeId");

ALTER TABLE "RecipeView" ADD CONSTRAINT "RecipeView_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecipeView" ADD CONSTRAINT "RecipeView_viewerId_fkey" FOREIGN KEY ("viewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_sourceRecipeId_fkey" FOREIGN KEY ("sourceRecipeId") REFERENCES "Recipe"("id") ON DELETE SET NULL ON UPDATE CASCADE;
