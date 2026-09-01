function logBoost(value) {
  return Math.log1p(Math.max(0, value));
}

export function scoreRecommendation(recipe, preferences = {}, now = new Date()) {
  const ageDays = Math.max(0, (now.getTime() - new Date(recipe.createdAt).getTime()) / 86400000);
  const ratingQuality = recipe.ratingCount ? (recipe.avgRating / 5) * logBoost(recipe.ratingCount) * 2 : 0;
  // Recent, high-intent actions matter most; views are deliberately a weak signal.
  const engagement = logBoost(
    (recipe.recentSaveCount ?? recipe.saveCount ?? 0) * 3
    + (recipe.recentCommentCount ?? recipe.commentCount ?? 0) * 2
    + (recipe.recentLikeCount ?? recipe.likeCount ?? 0)
    + (recipe.recentMakeCount ?? recipe.makeCount ?? 0) * 2
  ) * 2.5;
  const discovery = logBoost(recipe.recentViews || 0) * 0.5 + logBoost(recipe.followerCount || 0) * 0.6;
  const freshness = Math.max(0, 5 * (1 - ageDays / 30));
  const categoryAffinity = preferences.categories?.get(recipe.categorySlug) || 0;
  const matchingTags = recipe.tags.filter((tag) => preferences.tags?.has(tag));
  const tagAffinity = matchingTags.reduce((sum, tag) => sum + (preferences.tags.get(tag) || 0), 0);
  const followsAuthor = Boolean(recipe.authorId && preferences.following?.has(recipe.authorId));
  const preferredLanguage = preferences.language?.toLowerCase();
  const originalLanguageMatch = Boolean(preferredLanguage && recipe.originalLanguage?.toLowerCase() === preferredLanguage);
  const translationMatch = Boolean(preferredLanguage && recipe.availableLanguages?.some((language) => language.toLowerCase() === preferredLanguage));
  const languageAffinity = originalLanguageMatch ? 3 : translationMatch ? 1.25 : 0;
  const seenPenalty = preferences.viewed?.has(recipe.id) ? 1.5 : 0;
  const score = engagement + discovery + ratingQuality + freshness + categoryAffinity * 2 + tagAffinity + languageAffinity + (followsAuthor ? 6 : 0) - seenPenalty;

  const explicitEngagement =
    (recipe.recentSaveCount ?? recipe.saveCount ?? 0)
    + (recipe.recentCommentCount ?? recipe.commentCount ?? 0)
    + (recipe.recentLikeCount ?? recipe.likeCount ?? 0)
    + (recipe.recentMakeCount ?? recipe.makeCount ?? 0);
  let reasonCode;
  let reasonValue = undefined;
  if (followsAuthor) reasonCode = 'follow';
  else if (categoryAffinity > 0) { reasonCode = 'category'; reasonValue = recipe.categoryLabel; }
  else if (matchingTags.length) { reasonCode = 'tag'; reasonValue = matchingTags[0]; }
  else if (ageDays <= 14) reasonCode = 'fresh';
  else if (recipe.avgRating >= 4.5 && recipe.ratingCount >= 2) reasonCode = 'rated';
  else if (explicitEngagement >= 5) reasonCode = 'popular';

  return { score, reasonCode, reasonValue };
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
