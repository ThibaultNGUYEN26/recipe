UPDATE "Recipe"
SET "info" = jsonb_set(
  jsonb_set(COALESCE("info", '{}'::jsonb), '{restTime}', '"60 min"'::jsonb),
  '{totalTime}',
  '"95 min"'::jsonb
)
WHERE "slug" = 'baghrir';
