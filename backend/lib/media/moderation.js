import process from "node:process";
import { captureOperationalAlert } from "../monitoring.js";

const DECISIONS = new Set(["approved", "review_required", "rejected"]);

function reviewRequired(provider, error = null) {
  captureOperationalAlert("media-moderation", "Media moderation requires manual review", {
    provider,
    error: error ? String(error.message || error).slice(0, 200) : undefined,
  });
  return {
    decision: "review_required",
    categories: {},
    provider,
    ...(error && { error: String(error.message || error).slice(0, 500) }),
  };
}

export async function moderateMedia({ buffer, mimeType }) {
  // Env override — works in all environments
  if (process.env.MEDIA_MODERATION_DEV_DECISION) {
    const decision = process.env.MEDIA_MODERATION_DEV_DECISION;
    if (!DECISIONS.has(decision)) throw new Error("Invalid MEDIA_MODERATION_DEV_DECISION");
    return { decision, categories: {}, provider: "env-override" };
  }

  const apiUser = process.env.SIGHTENGINE_API_USER;
  const apiSecret = process.env.SIGHTENGINE_API_SECRET;

  if (!apiUser || !apiSecret) {
    return reviewRequired("sightengine-not-configured");
  }

  const form = new FormData();
  form.append("media", new Blob([buffer], { type: mimeType }), "upload");
  form.append("models", "nudity-2.1,weapon,recreational_drug,gore-2.0,hate-symbol");
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
      if (res.status === 402 || res.status === 429) return reviewRequired("sightengine-quota-exceeded");
      return reviewRequired(`sightengine-http-${res.status}`);
    }
    const data = await res.json();

    if (data.status !== "success") {
      if (data.error?.code === 4 || data.error?.type === "quota") {
        return reviewRequired("sightengine-quota-exceeded");
      }
      return reviewRequired("sightengine-invalid-response");
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
  } catch (error) {
    return reviewRequired(
      error?.name === "AbortError" ? "sightengine-timeout" : "sightengine-unavailable",
      error,
    );
  } finally {
    clearTimeout(timeout);
  }
}
