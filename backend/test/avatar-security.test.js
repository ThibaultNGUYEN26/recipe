import { Buffer } from "node:buffer";
import { beforeEach, describe, expect, it } from "vitest";
import express from "express";
import sharp from "sharp";
import request from "supertest";
import { processAvatarImage } from "../lib/media/imageProcessor.js";
import { handleAvatarUpload } from "../lib/media/upload.js";
import { submitAvatar } from "../lib/media/avatarService.js";

async function imageFixture(format = "jpeg", metadata = false) {
  let pipeline = sharp({ create: { width: 640, height: 480, channels: 3, background: "#d97706" } });
  if (metadata) pipeline = pipeline.withMetadata({ orientation: 6, exif: { IFD0: { Artist: "fixture" } } });
  return pipeline[format]().toBuffer();
}

function fakeStorage() {
  let sequence = 0;
  const quarantine = new Map();
  const approved = new Map();
  const removedApproved = [];
  return {
    quarantine, approved, removedApproved,
    async putQuarantine(bytes, extension) { const key = `00000000-0000-4000-8000-${String(++sequence).padStart(12, "0")}${extension}`; quarantine.set(key, bytes); return key; },
    async removeQuarantine(key) { quarantine.delete(key); },
    async publish(key) { const publicKey = `10000000-0000-4000-8000-${String(++sequence).padStart(12, "0")}.webp`; approved.set(publicKey, quarantine.get(key)); quarantine.delete(key); return publicKey; },
    async removeApproved(key) { removedApproved.push(key); approved.delete(key); },
    async readApproved(key) { return approved.get(key); },
  };
}

function fakeDb({ avatarUrl = "/api/media/old/avatar-256.webp", oldAsset = null } = {}) {
  const state = {
    user: { id: 1, name: "Chef", email: "chef@example.test", bio: null, avatarUrl, avatarMediaId: oldAsset?.id ?? null, pendingAvatarId: null, isAdmin: false },
    media: new Map(oldAsset ? [[oldAsset.id, oldAsset]] : []),
  };
  const db = {
    state,
    user: {
      async findUnique({ where, include, select }) {
        if (where.id !== state.user.id) return null;
        const result = { ...state.user };
        if (include?.pendingAvatar) result.pendingAvatar = state.media.get(state.user.pendingAvatarId) ?? null;
        if (include?.avatarMedia) result.avatarMedia = state.media.get(state.user.avatarMediaId) ?? null;
        if (select) return Object.fromEntries(Object.keys(select).map((key) => [key, result[key]]));
        return result;
      },
      async update({ where, data, select }) {
        if (where.id !== state.user.id) throw new Error("User not found");
        Object.assign(state.user, data);
        if (select) return Object.fromEntries(Object.keys(select).map((key) => [key, state.user[key]]));
        return { ...state.user };
      },
      async updateMany({ where, data }) {
        if ((where.id === undefined || where.id === state.user.id) && (where.pendingAvatarId === undefined || where.pendingAvatarId === state.user.pendingAvatarId)) {
          Object.assign(state.user, data); return { count: 1 };
        }
        return { count: 0 };
      },
    },
    mediaAsset: {
      async create({ data }) { const row = { ...data, variants: null, createdAt: new Date() }; state.media.set(row.id, row); return row; },
      async update({ where, data }) { const row = state.media.get(where.id); if (!row) throw new Error("Media not found"); Object.assign(row, data); return { ...row }; },
      async delete({ where }) { state.media.delete(where.id); return {}; },
      async findUnique({ where }) { return state.media.get(where.id) ?? null; },
    },
    async $transaction(arg) { return typeof arg === "function" ? arg(db) : Promise.all(arg); },
  };
  return db;
}

const approvedModeration = async () => ({ decision: "approved", categories: { nudity: 0, violence: 0 }, provider: "test" });

describe("avatar image validation and processing", () => {
  it("accepts a valid profile picture and creates square WebP variants", async () => {
    const result = await processAvatarImage(await imageFixture(), "image/jpeg");
    expect(result.verifiedMime).toBe("image/jpeg");
    expect(Object.keys(result.variants)).toEqual(["64", "128", "256", "512"]);
    for (const [size, bytes] of Object.entries(result.variants)) {
      const metadata = await sharp(bytes).metadata();
      expect(metadata.format).toBe("webp");
      expect(metadata.width).toBe(Number(size));
      expect(metadata.height).toBe(Number(size));
    }
  });

  it("rejects unsupported and animated image formats", async () => {
    const animatedGif = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
    await expect(processAvatarImage(animatedGif, "image/gif")).rejects.toMatchObject({ code: "UNSUPPORTED_IMAGE" });
  });

  it("rejects an oversized profile picture", async () => {
    await expect(processAvatarImage(Buffer.alloc(5 * 1024 * 1024 + 1), "image/jpeg")).rejects.toMatchObject({ code: "FILE_TOO_LARGE" });
  });

  it("rejects a fake MIME type", async () => {
    await expect(processAvatarImage(await imageFixture(), "image/png")).rejects.toMatchObject({ code: "MIME_MISMATCH" });
  });

  it("rejects malformed image bytes", async () => {
    await expect(processAvatarImage(Buffer.from([0xff, 0xd8, 0xff, 0x00]), "image/jpeg")).rejects.toMatchObject({ code: "MALFORMED_IMAGE" });
  });

  it("rejects an SVG/script upload", async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    await expect(processAvatarImage(svg, "image/svg+xml")).rejects.toMatchObject({ code: "UNSUPPORTED_IMAGE" });
  });

  it("strips EXIF metadata while decoding and re-encoding", async () => {
    const source = await imageFixture("jpeg", true);
    expect((await sharp(source).metadata()).exif).toBeDefined();
    const result = await processAvatarImage(source, "image/jpeg");
    for (const bytes of Object.values(result.variants)) {
      const metadata = await sharp(bytes).metadata();
      expect(metadata.exif).toBeUndefined();
      expect(metadata.xmp).toBeUndefined();
    }
  });
});

describe("avatar moderation lifecycle", () => {
  let file;
  beforeEach(async () => { file = { buffer: await imageFixture(), mimetype: "image/jpeg", originalname: "../../attack.jpg" }; });

  it("uses random keys and approves a valid profile picture", async () => {
    const db = fakeDb({ avatarUrl: "/api/media/default-avatar.svg" });
    const storage = fakeStorage();
    const result = await submitAvatar({ ownerId: 1, file, db, storage, moderate: approvedModeration });
    expect(result.status).toBe("approved");
    expect(db.state.user.avatarUrl).toMatch(/^\/api\/media\/[0-9a-f-]+\/avatar-256\.webp$/);
    expect([...storage.approved.keys()].every((key) => !key.includes("attack"))).toBe(true);
  });

  it.each([
    ["review_required", async () => ({ decision: "review_required", categories: {}, provider: "test" })],
    ["rejected", async () => ({ decision: "rejected", categories: { violence: 1 }, rejectionCategory: "violence", provider: "test" })],
  ])("keeps the previous approved avatar when moderation is %s", async (expected, moderate) => {
    const db = fakeDb();
    const storage = fakeStorage();
    const result = await submitAvatar({ ownerId: 1, file, db, storage, moderate });
    expect(result.status).toBe(expected);
    expect(db.state.user.avatarUrl).toBe("/api/media/old/avatar-256.webp");
    expect(db.state.user.avatarMediaId).toBeNull();
  });

  it("never approves when moderation fails", async () => {
    const db = fakeDb();
    const result = await submitAvatar({ ownerId: 1, file, db, storage: fakeStorage(), moderate: async () => { throw new Error("provider down"); } });
    expect(result.status).toBe("pending");
    expect(db.state.user.avatarUrl).toBe("/api/media/old/avatar-256.webp");
  });

  it("safely removes the replaced approved avatar after successful replacement", async () => {
    const oldAsset = { id: "old", ownerId: 1, kind: "AVATAR", status: "APPROVED", variants: { 256: { key: "20000000-0000-4000-8000-000000000001.webp", area: "approved" } } };
    const db = fakeDb({ oldAsset });
    const storage = fakeStorage();
    storage.approved.set(oldAsset.variants[256].key, Buffer.from("old"));
    await submitAvatar({ ownerId: 1, file, db, storage, moderate: approvedModeration });
    expect(storage.removedApproved).toContain(oldAsset.variants[256].key);
    expect(db.state.media.has("old")).toBe(false);
  });
});

describe("avatar endpoint protections", () => {
  it("rejects oversized multipart bodies before processing", async () => {
    const app = express();
    app.post("/avatar", handleAvatarUpload, (_req, res) => res.sendStatus(204));
    const response = await request(app).post("/avatar").attach("avatar", Buffer.alloc(5 * 1024 * 1024 + 1), "large.jpg");
    expect(response.status).toBe(400);
  });

  it("does not expose an endpoint for replacing another user's avatar", async () => {
    await expect(submitAvatar({
      actorId: 2,
      ownerId: 1,
      file: { buffer: await imageFixture(), mimetype: "image/jpeg" },
      db: fakeDb(),
      storage: fakeStorage(),
      moderate: approvedModeration,
    })).rejects.toMatchObject({ statusCode: 403 });
  });
});
