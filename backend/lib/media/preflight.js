import { prisma } from "../prisma.js";

export async function assertMediaInfrastructureReady(db = prisma) {
  if (!db.mediaAsset) {
    throw new Error("Prisma Client is out of date. Stop the backend and run: npx prisma generate");
  }

  try {
    await db.mediaAsset.findFirst({ select: { id: true } });
  } catch (error) {
    if (error.code === "P2021" || /MediaAsset|does not exist/i.test(error.message)) {
      throw new Error("Media database migration is missing. Run: npx prisma migrate deploy", { cause: error });
    }
    throw error;
  }
}
