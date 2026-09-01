import { describe, expect, it } from "vitest";
import { normalizeCategoryInput, normalizeTags } from "../lib/contentNormalization.js";

describe("recipe content normalization", () => {
  it("deduplicates tags regardless of casing and surrounding syntax", () => {
    expect(normalizeTags(["Dessert", " dessert ", "#DESSERT", "Pâtisserie", "pâtisserie"])).toEqual([
      "dessert",
      "pâtisserie",
    ]);
  });

  it("keeps categories readable while producing a stable accent-insensitive slug", () => {
    expect(normalizeCategoryInput("  Pâtisserie   française ")).toEqual({
      label: "Pâtisserie française",
      slug: "patisserie-francaise",
    });
  });
});
