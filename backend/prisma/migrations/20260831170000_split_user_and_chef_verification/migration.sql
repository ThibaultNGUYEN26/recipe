-- Keep existing creator verifications as identity verifications and introduce
-- a separate professional-chef credential that users may request independently.
CREATE TYPE "VerificationType" AS ENUM ('USER', 'CHEF');

ALTER TABLE "User" ADD COLUMN "isChefVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CreatorVerification" ADD COLUMN "type" "VerificationType" NOT NULL DEFAULT 'USER';

DROP INDEX "CreatorVerification_userId_key";
CREATE UNIQUE INDEX "CreatorVerification_userId_type_key" ON "CreatorVerification"("userId", "type");
