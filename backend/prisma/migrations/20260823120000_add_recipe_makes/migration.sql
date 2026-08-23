CREATE TABLE "RecipeMake" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "recipeId" INTEGER NOT NULL,
    "rating" INTEGER,
    "note" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecipeMake_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RecipeMake_userId_recipeId_key" ON "RecipeMake"("userId", "recipeId");
CREATE INDEX "RecipeMake_recipeId_createdAt_idx" ON "RecipeMake"("recipeId", "createdAt");

ALTER TABLE "RecipeMake" ADD CONSTRAINT "RecipeMake_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RecipeMake" ADD CONSTRAINT "RecipeMake_recipeId_fkey"
FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
