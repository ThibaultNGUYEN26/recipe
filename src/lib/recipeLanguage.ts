export function recipeLanguageCode(language: string | null | undefined): string | null {
  const code = language?.trim().toLowerCase().split('-')[0];
  return code && /^[a-z]{2,3}$/.test(code) ? code.toUpperCase() : null;
}
