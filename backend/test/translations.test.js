import { describe, expect, it } from "vitest";
import { normalizeLanguage, selectRecipeTranslation } from "../lib/translations.js";

const recipe = {
  originalLanguage: "fr",
  translations: [
    { language: "fr", title: "Soupe" },
    { language: "en", title: "Soup" },
  ],
};

describe("recipe translation selection", () => {
  it("normalizes regional application locales", () => {
    expect(normalizeLanguage("en-GB")).toBe("en");
    expect(normalizeLanguage("fr_FR")).toBe("fr");
    expect(normalizeLanguage("es-MX")).toBe("es");
  });

  it("uses the viewer's preferred translation when available", () => {
    expect(selectRecipeTranslation(recipe, "en")).toMatchObject({
      translation: { title: "Soup" },
      contentLanguage: "en",
      originalLanguage: "fr",
      isTranslated: true,
    });
  });

  it("falls back to the original language when the preference is unavailable", () => {
    expect(selectRecipeTranslation(recipe, "de")).toMatchObject({
      translation: { title: "Soupe" },
      contentLanguage: "fr",
      originalLanguage: "fr",
      isTranslated: false,
    });
  });

  it("falls back to the original recipe when Spanish content is unavailable", () => {
    expect(selectRecipeTranslation(recipe, "es")).toMatchObject({
      translation: { title: "Soupe" },
      contentLanguage: "fr",
      originalLanguage: "fr",
      isTranslated: false,
    });
  });

  it("falls back to any existing translation for legacy data", () => {
    const legacy = { originalLanguage: "fr", translations: [{ language: "en", title: "Soup" }] };
    expect(selectRecipeTranslation(legacy, "fr").translation?.title).toBe("Soup");
  });
});
