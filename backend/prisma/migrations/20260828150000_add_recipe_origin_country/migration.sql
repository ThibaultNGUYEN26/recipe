ALTER TABLE "Recipe" ADD COLUMN "originCountry" CHAR(2);

CREATE INDEX "Recipe_originCountry_idx" ON "Recipe"("originCountry");
