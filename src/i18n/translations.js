import en from './locales/en';

const messages = { en };

const localeLoaders = {
  ar: () => import('./locales/ar'),
  zh: () => import('./locales/zh'),
  fr: () => import('./locales/fr'),
  de: () => import('./locales/de'),
  it: () => import('./locales/it'),
  ko: () => import('./locales/ko'),
  ja: () => import('./locales/ja'),
  pt: () => import('./locales/pt'),
  es: () => import('./locales/es'),
  vi: () => import('./locales/vi'),
};

export const supportedLanguages = ['ar', 'zh', 'en', 'fr', 'de', 'it', 'ja', 'ko', 'pt', 'es', 'vi'];

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
