const SUPPORTED_LANGUAGES = new Set(["fr", "en", "es", "vi", "ar", "it", "zh", "de", "ja", "ko", "pt"]);

export function normalizeLanguage(value, fallback = "fr") {
  const language = String(value || "").trim().toLowerCase().split(/[-_]/)[0];
  return SUPPORTED_LANGUAGES.has(language) ? language : fallback;
}

export function selectRecipeTranslation(recipe, requestedLanguage) {
  const translations = Array.isArray(recipe?.translations) ? recipe.translations : [];
  const requested = normalizeLanguage(requestedLanguage);
  const originalLanguage = normalizeLanguage(recipe?.originalLanguage, translations[0]?.language || "fr");
  const translation = translations.find((item) => item.language === requested)
    || translations.find((item) => item.language === originalLanguage)
    || translations[0]
    || null;

  return {
    translation,
    contentLanguage: translation?.language || originalLanguage,
    originalLanguage,
    availableLanguages: [...new Set(translations.map((item) => item.language))],
    isTranslated: Boolean(translation && translation.language !== originalLanguage),
  };
}
