import { prisma } from "./prisma.js";
import { pushNotification } from "./sse.js";

export async function createNotification({ userId, actorId, type, recipeId = null, message = null }) {
  if (userId === actorId) return; // never notify yourself
  try {
    const actor = await prisma.user.findUnique({
      where: { id: actorId },
      select: { id: true, name: true, avatarUrl: true },
    });
    let recipeTitle = null;
    let recipeSlug = null;
    if (recipeId) {
      const recipe = await prisma.recipe.findUnique({
        where: { id: recipeId },
        select: { slug: true, translations: { where: { language: "fr" }, select: { title: true } } },
      });
      recipeSlug = recipe?.slug ?? null;
      recipeTitle = recipe?.translations[0]?.title ?? null;
    }

    const notification = await prisma.notification.create({
      data: { userId, actorId, type, recipeId, message },
    });

    pushNotification(userId, {
      id: notification.id,
      type,
      read: false,
      message,
      createdAt: notification.createdAt,
      actor: { id: actor.id, name: actor.name, avatarUrl: actor.avatarUrl },
      recipeSlug,
      recipeTitle,
    });
  } catch { /* non-critical, swallow */ }
}
