-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('AVATAR', 'RECIPE_IMAGE', 'RECIPE_VIDEO');

-- CreateEnum
CREATE TYPE "MediaStatus" AS ENUM ('UPLOADING', 'PENDING', 'APPROVED', 'REVIEW_REQUIRED', 'REJECTED', 'FAILED');

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "avatarMediaId" TEXT,
ADD COLUMN "pendingAvatarId" TEXT,
ADD COLUMN "isAdmin" BOOLEAN NOT NULL DEFAULT false;

-- Existing direct uploads were not signature-validated or processed. Stop exposing
-- them and fall back to the application-owned default until users upload replacements.
ALTER TABLE "User" ALTER COLUMN "avatarUrl" SET DEFAULT '/api/media/default-avatar.svg';
UPDATE "User" SET "avatarUrl" = '/api/media/default-avatar.svg';

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "kind" "MediaKind" NOT NULL,
    "status" "MediaStatus" NOT NULL DEFAULT 'UPLOADING',
    "ownerId" INTEGER NOT NULL,
    "recipeId" INTEGER,
    "quarantineKey" TEXT,
    "variants" JSONB,
    "verifiedMime" TEXT,
    "sizeBytes" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "durationSeconds" DOUBLE PRECISION,
    "moderationProvider" TEXT,
    "moderationScores" JSONB,
    "moderatedAt" TIMESTAMP(3),
    "rejectionCategory" TEXT,
    "processingError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_avatarMediaId_key" ON "User"("avatarMediaId");
CREATE UNIQUE INDEX "User_pendingAvatarId_key" ON "User"("pendingAvatarId");
CREATE INDEX "MediaAsset_ownerId_status_idx" ON "MediaAsset"("ownerId", "status");
CREATE INDEX "MediaAsset_recipeId_status_idx" ON "MediaAsset"("recipeId", "status");
CREATE INDEX "MediaAsset_status_createdAt_idx" ON "MediaAsset"("status", "createdAt");

ALTER TABLE "User" ADD CONSTRAINT "User_avatarMediaId_fkey" FOREIGN KEY ("avatarMediaId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "User" ADD CONSTRAINT "User_pendingAvatarId_fkey" FOREIGN KEY ("pendingAvatarId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
