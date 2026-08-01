import { mediaConfig } from "./config.js";
import process from "node:process";

const DECISIONS = new Set(["approved", "review_required", "rejected"]);
const CHECKS = ["nudity", "sexual", "violence", "gore", "hate_symbols", "weapons", "drugs", "abusive_text", "spam"];

export async function moderateMedia({ buffer, mimeType, kind = "avatar" }) {
  if (!mediaConfig.moderationEndpoint) {
    if (process.env.NODE_ENV !== "production" && process.env.MEDIA_MODERATION_DEV_DECISION) {
      const decision = process.env.MEDIA_MODERATION_DEV_DECISION;
      if (!DECISIONS.has(decision)) throw new Error("Invalid MEDIA_MODERATION_DEV_DECISION");
      return { decision, categories: {}, provider: "development-adapter" };
    }
    throw new Error("Media moderation provider is not configured");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), mediaConfig.moderationTimeoutMs);
  try {
    const response = await fetch(mediaConfig.moderationEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(mediaConfig.moderationApiKey && { Authorization: `Bearer ${mediaConfig.moderationApiKey}` }),
      },
      body: JSON.stringify({ kind, mimeType, checks: CHECKS, data: buffer.toString("base64") }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Moderation provider returned ${response.status}`);
    const result = await response.json();
    if (!DECISIONS.has(result.decision)) throw new Error("Moderation provider returned an invalid decision");
    return {
      decision: result.decision,
      categories: result.categories && typeof result.categories === "object" ? result.categories : {},
      rejectionCategory: typeof result.rejectionCategory === "string" ? result.rejectionCategory : null,
      provider: result.provider || "configured-provider",
    };
  } finally {
    clearTimeout(timeout);
  }
}
