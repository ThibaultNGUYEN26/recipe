CREATE TABLE "SavedCategory" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedCategory_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "SavedRecipe" ADD COLUMN "savedCategoryId" INTEGER;

CREATE UNIQUE INDEX "SavedCategory_userId_name_key" ON "SavedCategory"("userId", "name");
CREATE INDEX "SavedRecipe_savedCategoryId_idx" ON "SavedRecipe"("savedCategoryId");

ALTER TABLE "SavedCategory" ADD CONSTRAINT "SavedCategory_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SavedRecipe" ADD CONSTRAINT "SavedRecipe_savedCategoryId_fkey"
FOREIGN KEY ("savedCategoryId") REFERENCES "SavedCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
