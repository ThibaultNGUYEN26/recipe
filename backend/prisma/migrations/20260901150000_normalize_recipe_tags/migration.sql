UPDATE "Recipe" AS recipe
SET "tags" = normalized.tags
FROM (
  SELECT source.id, jsonb_agg(source.tag ORDER BY source.first_position) AS tags
  FROM (
    SELECT
      recipe_inner.id,
      lower(regexp_replace(trim(BOTH ' #' FROM item.value), '\s+', ' ', 'g')) AS tag,
      min(item.position) AS first_position
    FROM "Recipe" AS recipe_inner
    CROSS JOIN LATERAL jsonb_array_elements_text(recipe_inner."tags") WITH ORDINALITY AS item(value, position)
    WHERE jsonb_typeof(recipe_inner."tags") = 'array'
      AND trim(BOTH ' #' FROM item.value) <> ''
    GROUP BY recipe_inner.id, lower(regexp_replace(trim(BOTH ' #' FROM item.value), '\s+', ' ', 'g'))
  ) AS source
  GROUP BY source.id
) AS normalized
WHERE recipe.id = normalized.id;
