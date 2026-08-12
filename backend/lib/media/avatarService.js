import crypto from "crypto";
import { prisma } from "../prisma.js";
import { DEFAULT_AVATAR_URL } from "./config.js";
import { MediaValidationError } from "./errors.js";
import { processAvatarImage } from "./imageProcessor.js";
import { moderateMedia } from "./moderation.js";
import { mediaStorage } from "./storage.js";

function variantEntries(variants) {
  if (!variants || typeof variants !== "object") return [];
  return Object.values(variants).filter((item) => item && typeof item.key === "string");
}

export async function removeAssetObjects(asset, storage = mediaStorage) {
  if (!asset) return;
  if (asset.quarantineKey) await storage.removeQuarantine(asset.quarantineKey);
  for (const variant of variantEntries(asset.variants)) {
    if (variant.area === "approved" || (!variant.area && asset.status === "APPROVED")) await storage.removeApproved(variant.key);
    else await storage.removeQuarantine(variant.key);
  }
}

async function discardPendingAsset(asset, db, storage) {
  if (!asset) return;
  await db.user.updateMany({ where: { pendingAvatarId: asset.id }, data: { pendingAvatarId: null } });
  await removeAssetObjects(asset, storage);
  await db.mediaAsset.delete({ where: { id: asset.id } }).catch(() => {});
}

function publicAvatarUrl(assetId) {
  return `/api/media/${assetId}/avatar-256.webp`;
}

async function rejectAvatarAsset({ asset, audit, db, storage }) {
  await db.$transaction([
    db.user.updateMany({ where: { id: asset.ownerId, pendingAvatarId: asset.id }, data: { pendingAvatarId: null } }),
    db.mediaAsset.update({ where: { id: asset.id }, data: { ...audit, status: "REJECTED" } }),
  ]);
  try {
    await removeAssetObjects({ ...asset, status: "REJECTED" }, storage);
    await db.mediaAsset.update({ where: { id: asset.id }, data: { quarantineKey: null, variants: null } });
  } catch (error) {
    await db.mediaAsset.update({ where: { id: asset.id }, data: { processingError: `CLEANUP_PENDING: ${error.message}`.slice(0, 500) } }).catch(() => {});
  }
}

async function approveAvatarAsset({ asset, audit, db, storage }) {
  const approvedVariants = {};
  try {
    for (const [size, variant] of Object.entries(asset.variants || {})) {
      approvedVariants[size] = { ...variant, key: await storage.publish(variant.key), area: "approved" };
    }
    const replacement = await db.$transaction(async (tx) => {
      const current = await tx.user.findUnique({ where: { id: asset.ownerId }, select: { pendingAvatarId: true, avatarMediaId: true } });
      if (current?.pendingAvatarId !== asset.id) throw new Error("Avatar replacement was superseded");
      const oldAsset = current.avatarMediaId ? await tx.mediaAsset.findUnique({ where: { id: current.avatarMediaId } }) : null;
      if (oldAsset) await tx.mediaAsset.update({ where: { id: oldAsset.id }, data: { status: "FAILED", processingError: "REPLACED_CLEANUP_PENDING" } });
      await tx.mediaAsset.update({ where: { id: asset.id }, data: { ...audit, status: "APPROVED", variants: approvedVariants } });
      const user = await tx.user.update({
        where: { id: asset.ownerId },
        data: { avatarMediaId: asset.id, pendingAvatarId: null, avatarUrl: publicAvatarUrl(asset.id) },
        select: { id: true, name: true, email: true, bio: true, avatarUrl: true },
      });
      return { oldAsset, user };
    });
    if (replacement.oldAsset) {
      try {
        await removeAssetObjects(replacement.oldAsset, storage);
        await db.mediaAsset.delete({ where: { id: replacement.oldAsset.id } });
      } catch (error) {
        await db.mediaAsset.update({ where: { id: replacement.oldAsset.id }, data: { processingError: `CLEANUP_PENDING: ${error.message}`.slice(0, 500) } }).catch(() => {});
      }
    }
    return replacement.user;
  } catch (error) {
    for (const variant of variantEntries(approvedVariants)) await storage.removeApproved(variant.key);
    await db.mediaAsset.update({ where: { id: asset.id }, data: { status: "FAILED", processingError: error.message.slice(0, 500) } }).catch(() => {});
    throw error;
  }
}

export async function submitAvatar({ ownerId, actorId = ownerId, file, db = prisma, storage = mediaStorage, moderate = moderateMedia }) {
  if (actorId !== ownerId) {
    const error = new Error("You cannot replace another user's profile picture");
    error.statusCode = 403;
    throw error;
  }
  if (!file?.buffer) throw new MediaValidationError("A profile picture is required", "MISSING_FILE");

  const owner = await db.user.findUnique({
    where: { id: ownerId },
    include: { pendingAvatar: true },
  });
  if (!owner) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  const assetId = crypto.randomUUID();
  const rawKey = await storage.putQuarantine(file.buffer, ".bin");
  let asset;
  try {
    asset = await db.mediaAsset.create({
      data: {
        id: assetId,
        kind: "AVATAR",
        status: "UPLOADING",
        ownerId,
        quarantineKey: rawKey,
        sizeBytes: file.buffer.length,
      },
    });
    await db.user.update({ where: { id: ownerId }, data: { pendingAvatarId: assetId } });
  } catch (error) {
    await storage.removeQuarantine(rawKey);
    throw error;
  }

  if (owner.pendingAvatar && owner.pendingAvatar.id !== assetId) {
    await discardPendingAsset(owner.pendingAvatar, db, storage);
  }

  let processed;
  const privateVariants = {};
  try {
    processed = await processAvatarImage(file.buffer, file.mimetype);
    for (const [size, buffer] of Object.entries(processed.variants)) {
      const key = await storage.putQuarantine(buffer, ".webp");
      privateVariants[size] = { key, area: "quarantine", mime: "image/webp", width: Number(size), height: Number(size) };
    }
    await storage.removeQuarantine(rawKey);
    asset = await db.mediaAsset.update({
      where: { id: assetId },
      data: {
        status: "PENDING",
        quarantineKey: null,
        variants: privateVariants,
        verifiedMime: processed.verifiedMime,
        width: processed.width,
        height: processed.height,
      },
    });
  } catch (error) {
    await storage.removeQuarantine(rawKey);
    for (const variant of variantEntries(privateVariants)) await storage.removeQuarantine(variant.key);
    await db.$transaction([
      db.user.updateMany({ where: { id: ownerId, pendingAvatarId: assetId }, data: { pendingAvatarId: null } }),
      db.mediaAsset.update({
        where: { id: assetId },
        data: { status: "REJECTED", quarantineKey: null, variants: null, processingError: error.code || "PROCESSING_FAILED", rejectionCategory: "invalid_media" },
      }),
    ]).catch(() => {});
    throw error;
  }

  let moderation;
  try {
    moderation = await moderate({
      buffer: processed.variants[512],
      mimeType: "image/webp",
      kind: "avatar",
    });
  } catch (error) {
    await db.mediaAsset.update({
      where: { id: assetId },
      data: { status: "PENDING", processingError: `MODERATION_UNAVAILABLE: ${error.message}`.slice(0, 500) },
    });
    return { status: "pending", avatarUrl: owner.avatarUrl || DEFAULT_AVATAR_URL };
  }

  const audit = {
    moderationProvider: moderation.provider,
    moderationScores: moderation.categories,
    moderatedAt: new Date(),
    rejectionCategory: moderation.rejectionCategory || null,
    processingError: null,
  };

  if (moderation.decision === "review_required") {
    await db.mediaAsset.update({ where: { id: assetId }, data: { ...audit, status: "REVIEW_REQUIRED" } });
    return { status: "review_required", avatarUrl: owner.avatarUrl || DEFAULT_AVATAR_URL };
  }

  if (moderation.decision === "rejected") {
    await rejectAvatarAsset({ asset: { ...asset, variants: privateVariants }, audit, db, storage });
    return { status: "rejected", rejectionCategory: moderation.rejectionCategory || null, avatarUrl: owner.avatarUrl || DEFAULT_AVATAR_URL };
  }

  const approvedUser = await approveAvatarAsset({ asset: { ...asset, variants: privateVariants }, audit, db, storage });
  return { status: "approved", avatarUrl: approvedUser.avatarUrl, user: approvedUser };
}

export async function reviewAvatar({ reviewerId, assetId, decision, rejectionCategory = null, db = prisma, storage = mediaStorage }) {
  if (!new Set(["approved", "rejected"]).has(decision)) throw new MediaValidationError("Invalid review decision", "INVALID_DECISION");
  const [reviewer, asset] = await Promise.all([
    db.user.findUnique({ where: { id: reviewerId }, select: { isAdmin: true } }),
    db.mediaAsset.findUnique({ where: { id: assetId } }),
  ]);
  if (!reviewer?.isAdmin) {
    const error = new Error("Administrator access required");
    error.statusCode = 403;
    throw error;
  }
  if (!asset || asset.kind !== "AVATAR" || asset.status !== "REVIEW_REQUIRED") {
    const error = new Error("Avatar is not awaiting review");
    error.statusCode = 409;
    throw error;
  }
  const audit = {
    moderationProvider: "manual-review",
    moderatedAt: new Date(),
    rejectionCategory: decision === "rejected" ? rejectionCategory || "policy_violation" : null,
    processingError: null,
  };
  if (decision === "rejected") {
    await rejectAvatarAsset({ asset, audit, db, storage });
    return { status: "rejected" };
  }
  const user = await approveAvatarAsset({ asset, audit, db, storage });
  return { status: "approved", avatarUrl: user.avatarUrl };
}

export async function deleteOwnAvatar({ ownerId, db = prisma, storage = mediaStorage }) {
  const user = await db.user.findUnique({ where: { id: ownerId }, include: { avatarMedia: true, pendingAvatar: true } });
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }
  const assets = [user.avatarMedia, user.pendingAvatar].filter(Boolean);
  await db.$transaction([
    ...assets.map((asset) => db.mediaAsset.update({ where: { id: asset.id }, data: { status: "FAILED", processingError: "DELETION_CLEANUP_PENDING" } })),
    db.user.update({ where: { id: ownerId }, data: { avatarMediaId: null, pendingAvatarId: null, avatarUrl: DEFAULT_AVATAR_URL } }),
  ]);
  for (const asset of assets) {
    try {
      await removeAssetObjects(asset, storage);
      await db.mediaAsset.delete({ where: { id: asset.id } });
    } catch (error) {
      await db.mediaAsset.update({ where: { id: asset.id }, data: { processingError: `CLEANUP_PENDING: ${error.message}`.slice(0, 500) } }).catch(() => {});
    }
  }
  return { avatarUrl: DEFAULT_AVATAR_URL };
}
