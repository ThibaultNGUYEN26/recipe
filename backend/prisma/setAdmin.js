import process from "node:process";
import { prisma } from "../lib/prisma.js";

const identifier = process.argv[2]?.trim();
const revoke = process.argv.includes("--revoke");

if (!identifier) {
  console.error("Usage: npm run admin:grant -- <username-or-email> [--revoke]");
  process.exitCode = 1;
} else {
  try {
    const user = await prisma.user.findFirst({
      where: { OR: [{ username: identifier.toLowerCase() }, { email: identifier }] },
      select: { id: true, username: true, email: true },
    });
    if (!user) {
      console.error("User not found");
      process.exitCode = 1;
    } else {
      await prisma.user.update({ where: { id: user.id }, data: { isAdmin: !revoke } });
      console.log(`${user.username ? `@${user.username}` : user.email} ${revoke ? "is no longer an administrator" : "is now an administrator"}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}
