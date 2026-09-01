import { describe, expect, it } from "vitest";
import { isVerificationEligible, parseSocialLinks } from "../routes/verifications.js";

describe("creator verification evidence", () => {
  it("accepts and deduplicates public HTTP profile links", () => {
    expect(parseSocialLinks([
      " https://instagram.com/chef ",
      "https://instagram.com/chef",
      "http://example.com/chef",
    ])).toEqual(["https://instagram.com/chef", "http://example.com/chef"]);
  });

  it("accepts any combination of supported identity profiles", () => {
    expect(parseSocialLinks([
      "https://instagram.com/chef",
      "https://www.tiktok.com/@chef",
      "https://youtube.com/@chef",
    ], "USER")).toEqual([
      "https://instagram.com/chef",
      "https://www.tiktok.com/@chef",
      "https://youtube.com/@chef",
    ]);
    expect(parseSocialLinks(["https://www.tiktok.com/@chef"], "USER")).toEqual(["https://www.tiktok.com/@chef"]);
  });

  it.each([
    ["https://example.com/chef"],
    ["https://www.tiktok.com/@chef/video/123"],
    ["https://youtube.com/watch?v=123"],
  ])("rejects non-profile identity evidence", (links) => {
    expect(parseSocialLinks(links, "USER")).toBeNull();
  });

  it.each([
    [],
    ["javascript:alert(1)"],
    ["not a URL"],
    Array.from({ length: 6 }, (_, index) => `https://example.com/${index}`),
  ])("rejects invalid proof-link collections", (links) => {
    expect(parseSocialLinks(links)).toBeNull();
  });
});

describe("creator verification eligibility", () => {
  it("allows chefs to apply regardless of audience size", () => {
    expect(isVerificationEligible(0)).toBe(true);
    expect(isVerificationEligible(1500)).toBe(true);
  });
});
