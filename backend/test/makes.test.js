import { describe, expect, it } from "vitest";
import { normalizeMakeInput } from "../lib/makes.js";

describe("normalizeMakeInput", () => {
  it("accepts an empty contribution", () => {
    expect(normalizeMakeInput({})).toEqual({ note: null, rating: null, changes: [] });
  });

  it("trims the note and parses the rating", () => {
    expect(normalizeMakeInput({ note: "  More garlic!  ", rating: "5", changes: '["Added chilli","Added chilli","Reduced sugar"]' })).toEqual({
      note: "More garlic!",
      rating: 5,
      changes: ["Added chilli", "Reduced sugar"],
    });
  });

  it("rejects invalid ratings and long notes", () => {
    expect(() => normalizeMakeInput({ rating: "4.5" })).toThrow(/whole number/);
    expect(() => normalizeMakeInput({ note: "x".repeat(501) })).toThrow(/500/);
    expect(() => normalizeMakeInput({ changes: "not-json" })).toThrow(/valid list/);
    expect(() => normalizeMakeInput({ changes: Array.from({ length: 9 }, (_, index) => `change-${index}`) })).toThrow(/up to 8/);
  });
});
