import { prisma } from './prisma.js';

export async function blockedUserIds(userId) {
  if (!userId) return [];
  const blocks = await prisma.userBlock.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    select: { blockerId: true, blockedId: true },
  });
  return [...new Set(blocks.map((block) => block.blockerId === userId ? block.blockedId : block.blockerId))];
}

export async function usersAreBlocked(firstId, secondId) {
  if (!firstId || !secondId) return false;
  return Boolean(await prisma.userBlock.findFirst({
    where: { OR: [{ blockerId: firstId, blockedId: secondId }, { blockerId: secondId, blockedId: firstId }] },
    select: { id: true },
  }));
}
