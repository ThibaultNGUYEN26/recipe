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
