import { describe, expect, it } from "vitest";
import { diversifyRecommendations, scoreRecommendation } from "../lib/recommendations.js";

const base = {
  id: 1, createdAt: "2026-07-20T00:00:00.000Z", avgRating: 4.5, ratingCount: 8,
  saveCount: 10, recentViews: 50, categorySlug: "cakes", categoryLabel: "Cakes", tags: ["vegetarian"], authorId: 2,
};

describe("recipe recommendation ranking", () => {
  it("prioritizes followed creators and explains why", () => {
    const regular = scoreRecommendation(base, {}, new Date("2026-08-01T00:00:00.000Z"));
    const followed = scoreRecommendation(base, { following: new Set([2]) }, new Date("2026-08-01T00:00:00.000Z"));
    expect(followed.score).toBeGreaterThan(regular.score);
    expect(followed).toMatchObject({ reasonCode: "follow", reasonValue: undefined });
  });

  it("uses category preferences for an explainable boost", () => {
    const result = scoreRecommendation(base, { categories: new Map([["cakes", 3]]) }, new Date("2026-08-01T00:00:00.000Z"));
    expect(result).toMatchObject({ reasonCode: "category", reasonValue: "Cakes" });
  });

  it("rewards recent high-intent community activity", () => {
    const quiet = scoreRecommendation({ ...base, recentSaveCount: 0, recentCommentCount: 0, recentLikeCount: 0, recentMakeCount: 0 }, {}, new Date("2026-08-01T00:00:00.000Z"));
    const active = scoreRecommendation({ ...base, recentSaveCount: 3, recentCommentCount: 4, recentLikeCount: 8, recentMakeCount: 2 }, {}, new Date("2026-08-01T00:00:00.000Z"));
    expect(active.score).toBeGreaterThan(quiet.score);
  });

  it("gives fresh recipes and established creators a discovery boost", () => {
    const oldUnknown = scoreRecommendation({ ...base, createdAt: "2025-01-01T00:00:00.000Z", followerCount: 0 }, {}, new Date("2026-08-01T00:00:00.000Z"));
    const freshPopular = scoreRecommendation({ ...base, createdAt: "2026-07-31T00:00:00.000Z", followerCount: 100 }, {}, new Date("2026-08-01T00:00:00.000Z"));
    expect(freshPopular.score).toBeGreaterThan(oldUnknown.score);
  });

  it("avoids letting one category fill the beginning of a feed", () => {
    const items = [1, 2, 3, 4].map((id) => ({ id, categorySlug: id < 4 ? "cakes" : "mains" }));
    expect(diversifyRecommendations(items, 4).map((item) => item.id)).toEqual([1, 2, 4, 3]);
  });
});
