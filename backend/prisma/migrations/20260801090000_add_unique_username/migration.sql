-- Existing users can claim a username from profile settings. New registrations
-- require one at the API layer.
ALTER TABLE "User" ADD COLUMN "username" TEXT;

ALTER TABLE "User" ADD CONSTRAINT "User_username_format_check"
CHECK (
  "username" IS NULL OR (
    "username" = lower("username")
    AND char_length("username") BETWEEN 3 AND 30
    AND "username" ~ '^[a-z0-9._]+$'
  )
);

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
