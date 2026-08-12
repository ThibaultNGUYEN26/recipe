import { prisma } from "../lib/prisma.js";

const pending = await prisma.mediaAsset.findMany({
  where: { kind: "AVATAR", status: "PENDING" },
  select: { id: true, ownerId: true },
});

console.log(`Found ${pending.length} stuck pending avatar(s)`);

for (const asset of pending) {
  await prisma.user.updateMany({
    where: { pendingAvatarId: asset.id },
    data: { pendingAvatarId: null },
  });
  await prisma.mediaAsset.delete({ where: { id: asset.id } }).catch(() => {});
  console.log(`Cleared asset ${asset.id} (owner ${asset.ownerId})`);
}

console.log("Done.");
await prisma.$disconnect();
