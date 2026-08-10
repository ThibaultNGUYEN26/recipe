function logBoost(value) {
  return Math.log1p(Math.max(0, value));
}

export function scoreRecommendation(recipe, preferences = {}, now = new Date()) {
  const ageDays = Math.max(0, (now.getTime() - new Date(recipe.createdAt).getTime()) / 86400000);
  const ratingQuality = recipe.ratingCount ? (recipe.avgRating / 5) * logBoost(recipe.ratingCount) * 2 : 0;
  const popularity = logBoost(recipe.saveCount) * 2.2 + logBoost(recipe.recentViews) * 0.7;
  const freshness = Math.max(0, 4 - ageDays / 7);
  const categoryAffinity = preferences.categories?.get(recipe.categorySlug) || 0;
  const matchingTags = recipe.tags.filter((tag) => preferences.tags?.has(tag));
  const tagAffinity = matchingTags.reduce((sum, tag) => sum + (preferences.tags.get(tag) || 0), 0);
  const followsAuthor = Boolean(recipe.authorId && preferences.following?.has(recipe.authorId));
  const seenPenalty = preferences.viewed?.has(recipe.id) ? 1.5 : 0;
  const score = popularity + ratingQuality + freshness + categoryAffinity * 2 + tagAffinity + (followsAuthor ? 6 : 0) - seenPenalty;

  let reason = "Popular with Savor cooks";
  if (followsAuthor) reason = "From a creator you follow";
  else if (categoryAffinity > 0) reason = `Because you enjoy ${recipe.categoryLabel}`;
  else if (matchingTags.length) reason = `Because you like ${matchingTags[0]}`;
  else if (ageDays <= 14) reason = "Fresh from the community";
  else if (recipe.avgRating >= 4.5 && recipe.ratingCount >= 2) reason = "Highly rated by cooks";

  return { score, reason };
}

export function diversifyRecommendations(items, limit = 20) {
  const selected = [];
  const remaining = [...items];
  const categoryCounts = new Map();
  while (selected.length < limit && remaining.length) {
    let index = remaining.findIndex((item) => (categoryCounts.get(item.categorySlug) || 0) < 2);
    if (index < 0) index = 0;
    const [item] = remaining.splice(index, 1);
    selected.push(item);
    categoryCounts.set(item.categorySlug, (categoryCounts.get(item.categorySlug) || 0) + 1);
  }
  return selected;
}
