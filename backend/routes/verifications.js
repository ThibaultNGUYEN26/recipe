import { randomBytes } from "node:crypto";
import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();
const RESUBMIT_DELAY_MS = 24 * 60 * 60 * 1000; // Prevent repeated manual-review submissions.

export function isVerificationEligible() {
  return true;
}

function parseVerificationType(value) {
  return value === "CHEF" ? "CHEF" : "USER";
}

const IDENTITY_PROFILE_HOSTS = new Set([
  "instagram.com", "www.instagram.com",
  "tiktok.com", "www.tiktok.com", "m.tiktok.com",
  "youtube.com", "www.youtube.com", "m.youtube.com",
]);

function isIdentityProfileUrl(link) {
  const url = new URL(link);
  if (!IDENTITY_PROFILE_HOSTS.has(url.hostname.toLowerCase())) return false;
  const path = url.pathname.replace(/\/+$/, "");
  if (url.hostname.toLowerCase().includes("tiktok.com")) return /^\/@[^/]+$/i.test(path);
  if (url.hostname.toLowerCase().includes("youtube.com")) return /^\/(?:@[^/]+|channel\/[^/]+|c\/[^/]+|user\/[^/]+)$/i.test(path);
  return /^\/[^/]+$/i.test(path);
}

export function parseSocialLinks(value, type = "CHEF") {
  if (!Array.isArray(value)) return null;
  const links = [...new Set(value.map((link) => typeof link === "string" ? link.trim() : "").filter(Boolean))];
  if (links.length === 0 || links.length > 5) return null;
  try {
    const validUrls = links.every((link) => ["http:", "https:"].includes(new URL(link).protocol));
    if (!validUrls) return null;
    return type === "USER" && !links.every(isIdentityProfileUrl) ? null : links;
  } catch {
    return null;
  }
}

async function requireAdmin(req, res, next) {
  const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { isAdmin: true } });
  if (!user?.isAdmin) return res.status(403).json({ error: "Administrator access required" });
  next();
}

router.get("/me", authenticate, async (req, res) => {
  const type = parseVerificationType(req.query.type);
  const request = await prisma.creatorVerification.findUnique({
    where: { userId_type: { userId: req.user.id, type } },
    select: { id: true, type: true, status: true, socialLinks: true, message: true, verificationCode: true, rejectionReason: true, reviewedAt: true, createdAt: true, updatedAt: true },
  });
  res.json({ request, eligible: isVerificationEligible() });
});

router.post("/", authenticate, async (req, res) => {
  const type = parseVerificationType(req.body.type);
  const socialLinks = parseSocialLinks(req.body.socialLinks, type);
  const message = typeof req.body.message === "string" ? req.body.message.trim() : "";
  if (!socialLinks) return res.status(400).json({
    error: type === "USER"
      ? "Provide at least one valid Instagram, TikTok, or YouTube profile link"
      : "Provide 1-5 valid public profile links",
  });
  if (message.length > 500) return res.status(400).json({ error: "Message must be 500 characters or less" });

  try {
    const existing = await prisma.creatorVerification.findUnique({ where: { userId_type: { userId: req.user.id, type } } });
    if (existing?.status === "PENDING") return res.status(409).json({ error: "Your verification request is already pending" });
    if (existing?.status === "VERIFIED") return res.status(409).json({ error: "Your profile is already verified" });
    if (existing && Date.now() - existing.updatedAt.getTime() < RESUBMIT_DELAY_MS) {
      return res.status(429).json({ error: "Wait 24 hours before submitting another request" });
    }

    const verificationCode = `savor-${randomBytes(4).toString("hex")}`;
    const request = await prisma.creatorVerification.upsert({
      where: { userId_type: { userId: req.user.id, type } },
      update: { status: "PENDING", socialLinks, message: message || null, verificationCode, rejectionReason: null, reviewedById: null, reviewedAt: null },
      create: { userId: req.user.id, type, socialLinks, message: message || null, verificationCode },
      select: { id: true, type: true, status: true, socialLinks: true, message: true, verificationCode: true, createdAt: true },
    });
    res.status(201).json({ request });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to submit verification request" });
  }
});

router.get("/admin", authenticate, requireAdmin, async (req, res) => {
  const status = ["PENDING", "VERIFIED", "REJECTED"].includes(req.query.status) ? req.query.status : "PENDING";
  const requests = await prisma.creatorVerification.findMany({
    where: { status },
    include: { user: { select: { id: true, username: true, name: true, avatarUrl: true, isVerified: true, isChefVerified: true } } },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
  res.json(requests);
});

router.patch("/admin/:id", authenticate, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const decision = req.body.decision;
  const rejectionReason = typeof req.body.rejectionReason === "string" ? req.body.rejectionReason.trim() : "";
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid request id" });
  if (!["VERIFIED", "REJECTED"].includes(decision)) return res.status(400).json({ error: "Decision must be VERIFIED or REJECTED" });
  if (decision === "REJECTED" && !rejectionReason) return res.status(400).json({ error: "A rejection reason is required" });

  try {
    const existing = await prisma.creatorVerification.findUnique({ where: { id }, select: { userId: true, type: true } });
    if (!existing) return res.status(404).json({ error: "Verification request not found" });
    const request = await prisma.$transaction(async (tx) => {
      const updated = await tx.creatorVerification.update({
        where: { id },
        data: { status: decision, rejectionReason: decision === "REJECTED" ? rejectionReason : null, reviewedById: req.user.id, reviewedAt: new Date() },
      });
      await tx.user.update({
        where: { id: existing.userId },
        data: existing.type === "CHEF"
          ? { isChefVerified: decision === "VERIFIED" }
          : { isVerified: decision === "VERIFIED" },
      });
      return updated;
    });
    res.json({ request });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to review verification request" });
  }
});

export default router;
