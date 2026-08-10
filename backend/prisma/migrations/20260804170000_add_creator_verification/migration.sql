CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

ALTER TABLE "User" ADD COLUMN "isVerified" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "CreatorVerification" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "socialLinks" JSONB NOT NULL,
    "message" TEXT,
    "verificationCode" TEXT NOT NULL,
    "rejectionReason" TEXT,
    "reviewedById" INTEGER,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorVerification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CreatorVerification_userId_key" ON "CreatorVerification"("userId");
CREATE INDEX "CreatorVerification_status_createdAt_idx" ON "CreatorVerification"("status", "createdAt");
CREATE INDEX "CreatorVerification_reviewedById_idx" ON "CreatorVerification"("reviewedById");

ALTER TABLE "CreatorVerification" ADD CONSTRAINT "CreatorVerification_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CreatorVerification" ADD CONSTRAINT "CreatorVerification_reviewedById_fkey"
FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
