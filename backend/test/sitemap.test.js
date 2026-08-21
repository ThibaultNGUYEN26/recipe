import { describe, expect, it } from "vitest";
import { buildSitemap } from "../lib/sitemap.js";

describe("sitemap", () => {
  it("includes every supplied public recipe using its canonical route", () => {
    const xml = buildSitemap([
      { slug: "crème-brûlée", updatedAt: new Date("2026-08-20T10:00:00Z"), author: { username: "chef & co" } },
      { slug: "community-soup", updatedAt: new Date("2026-08-19T10:00:00Z"), author: null },
    ], "https://example.com/");

    expect(xml).toContain("https://example.com/chef%20%26%20co/cr%C3%A8me-br%C3%BBl%C3%A9e");
    expect(xml).toContain("https://example.com/recipe/community-soup");
    expect(xml).toContain("<lastmod>2026-08-20T10:00:00.000Z</lastmod>");
    expect(xml.match(/<url>/g)).toHaveLength(10);
  });
});
