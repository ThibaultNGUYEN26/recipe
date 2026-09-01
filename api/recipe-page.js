import process from 'node:process';

const SITE_URL = 'https://recipe.thibault-nguyen.dev';
const DEFAULT_API_URL = 'https://recipe-production-4bd0.up.railway.app';
const SUPPORTED_LANGUAGES = new Set(['ar', 'zh', 'en', 'fr', 'de', 'it', 'ja', 'ko', 'pt', 'es', 'vi']);

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function absoluteUrl(value, base = SITE_URL) {
  if (!value) return null;
  try { return new URL(value, base).toString(); } catch { return null; }
}

function requestLanguage(req) {
  const requested = String(req.query.lang || '').toLowerCase().slice(0, 2);
  if (SUPPORTED_LANGUAGES.has(requested)) return requested;
  const accepted = String(req.headers['accept-language'] || '').toLowerCase().match(/[a-z]{2}/)?.[0];
  return SUPPORTED_LANGUAGES.has(accepted) ? accepted : 'en';
}

function isoDuration(value) {
  if (!value) return undefined;
  const normalized = String(value).trim().toLowerCase().replace(',', '.');
  const hours = normalized.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hour|heure)/)?.[1];
  const minutes = normalized.match(/(\d+(?:\.\d+)?)\s*(?:m|min|minute)/)?.[1];
  return hours || minutes ? `PT${hours ? `${hours}H` : ''}${minutes ? `${minutes}M` : ''}` : undefined;
}

function recipeSchema(recipe, canonical, image) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    '@id': `${canonical}#recipe`,
    url: canonical,
    name: recipe.title,
    description: recipe.description || undefined,
    image: image ? [image] : undefined,
    author: recipe.authorName || recipe.authorUsername
      ? { '@type': 'Person', name: recipe.authorName || recipe.authorUsername }
      : { '@type': 'Organization', name: 'Savor' },
    datePublished: recipe.createdAt,
    dateModified: recipe.updatedAt,
    prepTime: isoDuration(recipe.info?.prepTime),
    cookTime: isoDuration(recipe.info?.cookTime),
    totalTime: isoDuration(recipe.info?.totalTime),
    recipeYield: recipe.info?.servings ? `${recipe.info.servings} servings` : undefined,
    recipeCategory: recipe.category?.label,
    keywords: Array.isArray(recipe.tags) ? recipe.tags.join(', ') : undefined,
    inLanguage: recipe.contentLanguage,
    recipeIngredient: Array.isArray(recipe.ingredients)
      ? recipe.ingredients.flatMap((section) => section.items || [])
      : undefined,
    recipeInstructions: Array.isArray(recipe.instructions)
      ? recipe.instructions.map((step, index) => ({ '@type': 'HowToStep', position: step.step || index + 1, text: step.text }))
      : undefined,
    aggregateRating: recipe.avgRating && recipe.ratingCount
      ? { '@type': 'AggregateRating', ratingValue: recipe.avgRating, ratingCount: recipe.ratingCount, bestRating: 5, worstRating: 1 }
      : undefined,
  };
  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
}

function replaceMeta(html, selector, content) {
  const escaped = escapeHtml(content);
  const pattern = selector.startsWith('property=')
    ? new RegExp(`<meta\\s+property=["']${selector.slice(9)}["'][^>]*>`, 'i')
    : new RegExp(`<meta\\s+name=["']${selector.slice(5)}["'][^>]*>`, 'i');
  const attribute = selector.startsWith('property=') ? 'property' : 'name';
  const name = selector.slice(selector.indexOf('=') + 1);
  const tag = `<meta ${attribute}="${name}" content="${escaped}" />`;
  return pattern.test(html) ? html.replace(pattern, tag) : html.replace('</head>', `    ${tag}\n  </head>`);
}

function renderRecipeHtml(html, recipe, apiUrl) {
  const canonicalPath = recipe.authorUsername
    ? `/${encodeURIComponent(recipe.authorUsername)}/${encodeURIComponent(recipe.slug)}`
    : `/recipe/${encodeURIComponent(recipe.slug)}`;
  const canonical = absoluteUrl(canonicalPath);
  const image = absoluteUrl(recipe.image, apiUrl) || `${SITE_URL}/favicon.png`;
  const title = `${recipe.title} — Savor`;
  const description = recipe.description || `View ingredients and instructions for ${recipe.title} on Savor.`;

  html = html.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(title)}</title>`);
  html = html.replace(/<link\s+rel=["']canonical["'][^>]*>/i, `<link rel="canonical" href="${escapeHtml(canonical)}" />`);
  html = html.replace(/<html\s+lang=["'][^"']*["']/i, `<html lang="${escapeHtml(recipe.contentLanguage || 'en')}"`);
  html = replaceMeta(html, 'name=description', description);
  html = replaceMeta(html, 'name=robots', recipe.isPublic ? 'index, follow' : 'noindex, nofollow');
  html = replaceMeta(html, 'property=og:title', title);
  html = replaceMeta(html, 'property=og:description', description);
  html = replaceMeta(html, 'property=og:type', 'article');
  html = replaceMeta(html, 'property=og:url', canonical);
  html = replaceMeta(html, 'property=og:image', image);
  html = replaceMeta(html, 'name=twitter:title', title);
  html = replaceMeta(html, 'name=twitter:description', description);
  html = replaceMeta(html, 'name=twitter:image', image);

  const schema = JSON.stringify(recipeSchema(recipe, canonical, image)).replaceAll('<', '\\u003c');
  return html.replace('</head>', `    <script type="application/ld+json">${schema}</script>\n  </head>`);
}

export default async function handler(req, res) {
  const slug = typeof req.query.slug === 'string' ? req.query.slug : '';
  const expectedUsername = typeof req.query.username === 'string' ? req.query.username : null;
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const origin = `${protocol}://${req.headers.host}`;
  const apiUrl = process.env.VITE_API_URL || DEFAULT_API_URL;

  try {
    const shellResponse = await fetch(`${origin}/`);
    if (!shellResponse.ok) throw new Error(`Frontend shell returned ${shellResponse.status}`);
    const shell = await shellResponse.text();
    if (!slug) return res.status(200).setHeader('Content-Type', 'text/html; charset=utf-8').send(shell);

    const recipeResponse = await fetch(`${apiUrl}/api/recipes/${encodeURIComponent(slug)}?lang=${requestLanguage(req)}`);
    if (!recipeResponse.ok) return res.status(200).setHeader('Content-Type', 'text/html; charset=utf-8').send(shell);
    const recipe = await recipeResponse.json();
    if (!recipe.isPublic || (expectedUsername && recipe.authorUsername !== expectedUsername)) {
      return res.status(200).setHeader('Content-Type', 'text/html; charset=utf-8').send(shell);
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
    return res.status(200).send(renderRecipeHtml(shell, recipe, apiUrl));
  } catch (error) {
    console.error('Recipe metadata rendering failed', error);
    return res.status(502).send('Unable to render recipe page');
  }
}
