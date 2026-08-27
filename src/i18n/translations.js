import en from './locales/en';

const messages = { en };

const localeLoaders = {
  fr: () => import('./locales/fr'),
  es: () => import('./locales/es'),
  vi: () => import('./locales/vi'),
  ar: () => import('./locales/ar'),
  it: () => import('./locales/it'),
  zh: () => import('./locales/zh'),
  de: () => import('./locales/de'),
  ko: () => import('./locales/ko'),
};

export const supportedLanguages = ['en', 'fr', 'es', 'vi', 'ar', 'it', 'zh', 'de', 'ko'];

export async function loadLanguage(language) {
  if (messages[language] || !localeLoaders[language]) return;
  const locale = await localeLoaders[language]();
  messages[language] = locale.default;
}

export function translate(language, key, values = {}) {
  const template = messages[language]?.[key] ?? messages.en[key] ?? key;
  return Object.entries(values).reduce(
    (result, [name, value]) => result.replaceAll(`{${name}}`, String(value)),
    template,
  );
}
