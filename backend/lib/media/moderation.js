import process from "node:process";

const DECISIONS = new Set(["approved", "review_required", "rejected"]);

export async function moderateMedia({ buffer, mimeType, kind = "avatar" }) {
  // Dev override (non-production only)
  if (process.env.NODE_ENV !== "production" && process.env.MEDIA_MODERATION_DEV_DECISION) {
    const decision = process.env.MEDIA_MODERATION_DEV_DECISION;
    if (!DECISIONS.has(decision)) throw new Error("Invalid MEDIA_MODERATION_DEV_DECISION");
    return { decision, categories: {}, provider: "development-adapter" };
  }

  const apiUser = process.env.SIGHTENGINE_API_USER;
  const apiSecret = process.env.SIGHTENGINE_API_SECRET;

  if (!apiUser || !apiSecret) {
    // No moderation configured — auto-approve in production only if explicitly set
    if (process.env.MEDIA_MODERATION_DEV_DECISION === "approved") {
      return { decision: "approved", categories: {}, provider: "bypass" };
    }
    throw new Error("Media moderation is not configured. Set SIGHTENGINE_API_USER and SIGHTENGINE_API_SECRET.");
  }

  const form = new FormData();
  form.append("media", new Blob([buffer], { type: mimeType }), "upload");
  form.append("models", "nudity-2.1,weapon,recreational_drug,gore-2.0,hate_symbol");
  form.append("api_user", apiUser);
  form.append("api_secret", apiSecret);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch("https://api.sightengine.com/1.0/check.json", {
      method: "POST",
      body: form,
      signal: controller.signal,
    });

    if (!res.ok) {
      // Quota exceeded or billing issue — fall back to manual review
      if (res.status === 402 || res.status === 429) {
        return { decision: "review_required", categories: {}, provider: "sightengine-quota-exceeded" };
      }
      throw new Error(`Sightengine returned ${res.status}`);
    }
    const data = await res.json();

    if (data.status !== "success") {
      // API-level error (e.g. quota) — fall back to manual review
      if (data.error?.code === 4 || data.error?.type === "quota") {
        return { decision: "review_required", categories: {}, provider: "sightengine-quota-exceeded" };
      }
      throw new Error(`Sightengine error: ${data.error?.message ?? "unknown"}`);
    }

    // Evaluate scores — reject if any unsafe category exceeds threshold
    const categories = {};
    let rejectionCategory = null;

    const nudityScore = Math.max(
      data.nudity?.sexual_activity ?? 0,
      data.nudity?.sexual_display ?? 0,
      data.nudity?.erotica ?? 0,
    );
    categories.nudity = nudityScore;
    if (nudityScore > 0.5) rejectionCategory = "nudity";

    const goreScore = data.gore?.prob ?? 0;
    categories.gore = goreScore;
    if (goreScore > 0.6 && !rejectionCategory) rejectionCategory = "gore";

    const weaponScore = data.weapon ?? 0;
    categories.weapon = weaponScore;
    if (weaponScore > 0.7 && !rejectionCategory) rejectionCategory = "weapon";

    const drugScore = data.recreational_drug?.prob ?? 0;
    categories.drug = drugScore;
    if (drugScore > 0.7 && !rejectionCategory) rejectionCategory = "drug";

    const hateScore = data.hate_symbol?.prob ?? 0;
    categories.hate = hateScore;
    if (hateScore > 0.6 && !rejectionCategory) rejectionCategory = "hate";

    const decision = rejectionCategory ? "rejected" : "approved";

    return { decision, categories, rejectionCategory, provider: "sightengine" };
  } finally {
    clearTimeout(timeout);
  }
}
