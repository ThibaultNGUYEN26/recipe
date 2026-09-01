export function recipeLanguageCode(language: string | null | undefined): string | null {
  const code = language?.trim().toLowerCase().split('-')[0];
  return code && /^[a-z]{2,3}$/.test(code) ? code.toUpperCase() : null;
}

const LANGUAGE_FLAGS: Record<string, string> = {
  ar: '🇸🇦',
  de: '🇩🇪',
  en: '🇬🇧',
  es: '🇪🇸',
  fr: '🇫🇷',
  it: '🇮🇹',
  ja: '🇯🇵',
  ko: '🇰🇷',
  pt: '🇵🇹',
  vi: '🇻🇳',
  zh: '🇨🇳',
};

export function recipeLanguageFlag(language: string | null | undefined): string | null {
  const code = language?.trim().toLowerCase().split('-')[0];
  return code ? LANGUAGE_FLAGS[code] ?? null : null;
}
