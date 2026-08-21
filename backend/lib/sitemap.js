const DEFAULT_APP_URL = "https://recipe.thibault-nguyen.dev";

const STATIC_ROUTES = [
  ["/", "daily", "1.0"],
  ["/search", "daily", "0.9"],
  ["/about", "monthly", "0.5"],
  ["/contact", "monthly", "0.5"],
  ["/privacy-policy", "monthly", "0.4"],
  ["/terms", "monthly", "0.4"],
  ["/cookies", "monthly", "0.4"],
  ["/cookie-settings", "monthly", "0.3"],
];

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function recipePath(recipe) {
  const slug = encodeURIComponent(recipe.slug);
  return recipe.author?.username
    ? `/${encodeURIComponent(recipe.author.username)}/${slug}`
    : `/recipe/${slug}`;
}

function urlEntry(appUrl, path, { changefreq, priority, lastmod } = {}) {
  const url = new URL(path, `${appUrl}/`).toString();
  const fields = [`<loc>${escapeXml(url)}</loc>`];
  if (lastmod) fields.push(`<lastmod>${new Date(lastmod).toISOString()}</lastmod>`);
  if (changefreq) fields.push(`<changefreq>${changefreq}</changefreq>`);
  if (priority) fields.push(`<priority>${priority}</priority>`);
  return `  <url>${fields.join("")}</url>`;
}

export function buildSitemap(recipes, configuredAppUrl = DEFAULT_APP_URL) {
  const appUrl = configuredAppUrl.replace(/\/+$/, "");
  const staticEntries = STATIC_ROUTES.map(([path, changefreq, priority]) =>
    urlEntry(appUrl, path, { changefreq, priority })
  );
  const recipeEntries = recipes.map((recipe) =>
    urlEntry(appUrl, recipePath(recipe), {
      changefreq: "weekly",
      priority: "0.8",
      lastmod: recipe.updatedAt,
    })
  );

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...staticEntries,
    ...recipeEntries,
    "</urlset>",
    "",
  ].join("\n");
}
