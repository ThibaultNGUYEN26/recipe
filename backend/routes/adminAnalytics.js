import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authenticate, requireAdmin } from "../middleware/authenticate.js";
import { selectRecipeTranslation } from "../lib/translations.js";

const router = Router();
const ALLOWED_RANGES = new Set([7, 30, 90]);

function startOfUtcDay(value = new Date()) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function percentChange(current, previous) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / previous) * 100);
}

function trend(records, dateField, from) {
  const current = records.filter((record) => record[dateField] >= from).length;
  return { value: current, change: percentChange(current, records.length - current) };
}

router.get("/", authenticate, requireAdmin, async (req, res) => {
  const requestedDays = Number(req.query.days);
  const days = ALLOWED_RANGES.has(requestedDays) ? requestedDays : 30;
  const lang = String(req.query.lang || "en");
  const to = new Date();
  const from = startOfUtcDay(new Date(to.getTime() - (days - 1) * 86400000));
  const previousFrom = new Date(from.getTime() - days * 86400000);

  try {
    const [
      totalUsers, verifiedUsers, totalRecipes, publicRecipes, pendingVerifications,
      users, recipes, views, saves, ratings, comments, likes, follows,
      topRecipeRows, topCreatorRows, recentUserRows,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { emailVerifiedAt: { not: null } } }),
      prisma.recipe.count(),
      prisma.recipe.count({ where: { isPublic: true } }),
      prisma.creatorVerification.count({ where: { status: "PENDING" } }),
      prisma.user.findMany({ where: { createdAt: { gte: previousFrom } }, select: { id: true, createdAt: true } }),
      prisma.recipe.findMany({ where: { createdAt: { gte: previousFrom } }, select: { id: true, authorId: true, createdAt: true } }),
      prisma.recipeView.findMany({ where: { viewedAt: { gte: previousFrom } }, select: { viewerId: true, recipeId: true, viewedAt: true } }),
      prisma.savedRecipe.findMany({ where: { savedAt: { gte: previousFrom } }, select: { userId: true, recipeId: true, savedAt: true } }),
      prisma.rating.findMany({ where: { createdAt: { gte: previousFrom } }, select: { userId: true, recipeId: true, createdAt: true } }),
      prisma.comment.findMany({ where: { createdAt: { gte: previousFrom } }, select: { userId: true, recipeId: true, createdAt: true } }),
      prisma.recipeLike.findMany({ where: { createdAt: { gte: previousFrom } }, select: { userId: true, recipeId: true, createdAt: true } }),
      prisma.follow.findMany({ where: { createdAt: { gte: previousFrom } }, select: { followerId: true, followingId: true, createdAt: true } }),
      prisma.recipe.findMany({
        where: { isPublic: true },
        include: {
          translations: true,
          images: { where: { isMain: true }, take: 1 },
          author: { select: { id: true, username: true, name: true } },
          ratings: { select: { score: true } },
          _count: { select: { views: true, savedBy: true, likes: true, comments: true } },
        },
        orderBy: { views: { _count: "desc" } },
        take: 8,
      }),
      prisma.user.findMany({
        where: { recipes: { some: { isPublic: true } } },
        select: {
          id: true, username: true, name: true, avatarUrl: true, isVerified: true,
          _count: { select: { recipes: { where: { isPublic: true } }, followers: true } },
        },
        orderBy: { followers: { _count: "desc" } },
        take: 8,
      }),
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        select: { id: true, username: true, name: true, avatarUrl: true, emailVerifiedAt: true, createdAt: true },
      }),
    ]);

    const currentRecords = (records, dateField) => records.filter((record) => record[dateField] >= from);
    const currentViews = currentRecords(views, "viewedAt");
    const currentSaves = currentRecords(saves, "savedAt");
    const currentRatings = currentRecords(ratings, "createdAt");
    const currentComments = currentRecords(comments, "createdAt");
    const currentLikes = currentRecords(likes, "createdAt");
    const currentFollows = currentRecords(follows, "createdAt");
    const currentInteractions = currentSaves.length + currentRatings.length + currentComments.length + currentLikes.length + currentFollows.length;
    const previousInteractions = (saves.length - currentSaves.length) + (ratings.length - currentRatings.length) + (comments.length - currentComments.length) + (likes.length - currentLikes.length) + (follows.length - currentFollows.length);

    const activeUserIds = new Set();
    for (const item of currentViews) if (item.viewerId) activeUserIds.add(item.viewerId);
    for (const item of currentSaves) activeUserIds.add(item.userId);
    for (const item of currentRatings) activeUserIds.add(item.userId);
    for (const item of currentComments) activeUserIds.add(item.userId);
    for (const item of currentLikes) activeUserIds.add(item.userId);
    for (const item of currentFollows) activeUserIds.add(item.followerId);

    const dateKey = (date) => date.toISOString().slice(0, 10);
    const series = Array.from({ length: days }, (_, index) => {
      const date = new Date(from.getTime() + index * 86400000);
      return { date: dateKey(date), users: 0, recipes: 0, views: 0, interactions: 0, activeUsers: 0 };
    });
    const daysByDate = new Map(series.map((day) => [day.date, day]));
    const activeByDate = new Map(series.map((day) => [day.date, new Set()]));
    const increment = (date, field) => { const day = daysByDate.get(dateKey(date)); if (day) day[field] += 1; };
    const activate = (date, userId) => { if (userId) activeByDate.get(dateKey(date))?.add(userId); };

    for (const item of currentRecords(users, "createdAt")) increment(item.createdAt, "users");
    for (const item of currentRecords(recipes, "createdAt")) increment(item.createdAt, "recipes");
    for (const item of currentViews) { increment(item.viewedAt, "views"); activate(item.viewedAt, item.viewerId); }
    for (const item of currentSaves) { increment(item.savedAt, "interactions"); activate(item.savedAt, item.userId); }
    for (const collection of [currentRatings, currentComments, currentLikes]) {
      for (const item of collection) { increment(item.createdAt, "interactions"); activate(item.createdAt, item.userId); }
    }
    for (const item of currentFollows) { increment(item.createdAt, "interactions"); activate(item.createdAt, item.followerId); }
    for (const day of series) day.activeUsers = activeByDate.get(day.date).size;

    const topRecipes = topRecipeRows.map((recipe) => {
      const translation = selectRecipeTranslation(recipe, lang).translation;
      const average = recipe.ratings.length ? recipe.ratings.reduce((sum, rating) => sum + rating.score, 0) / recipe.ratings.length : null;
      return {
        slug: recipe.slug,
        title: translation?.title || recipe.slug,
        image: recipe.images[0]?.url || recipe.sourceThumbnailUrl || null,
        author: recipe.author,
        views: recipe._count.views,
        saves: recipe._count.savedBy,
        likes: recipe._count.likes,
        comments: recipe._count.comments,
        ratingCount: recipe.ratings.length,
        avgRating: average,
      };
    });

    res.json({
      range: { days, from: from.toISOString(), to: to.toISOString() },
      totals: {
        users: totalUsers,
        verifiedUsers,
        verificationRate: totalUsers ? (verifiedUsers / totalUsers) * 100 : 0,
        recipes: totalRecipes,
        publicRecipes,
        pendingVerifications,
      },
      summary: {
        newUsers: trend(users, "createdAt", from),
        newRecipes: trend(recipes, "createdAt", from),
        views: trend(views, "viewedAt", from),
        interactions: { value: currentInteractions, change: percentChange(currentInteractions, previousInteractions) },
        activeUsers: activeUserIds.size,
        saves: currentSaves.length,
        likes: currentLikes.length,
        ratings: currentRatings.length,
        comments: currentComments.length,
        follows: currentFollows.length,
      },
      series,
      topRecipes,
      topCreators: topCreatorRows.map(({ _count, ...creator }) => ({ ...creator, recipeCount: _count.recipes, followerCount: _count.followers })),
      recentUsers: recentUserRows.map(({ emailVerifiedAt, ...user }) => ({ ...user, emailVerified: Boolean(emailVerifiedAt) })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to load platform analytics" });
  }
});

export default router;
