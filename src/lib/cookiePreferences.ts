export const COOKIE_PREFERENCES_KEY = 'savor-cookie-preferences';
export const ANALYTICS_VISITOR_KEY = 'savor-analytics-visitor';

export interface CookiePreferences {
  analytics: boolean;
  updatedAt?: string;
}

export function getCookiePreferences(): CookiePreferences {
  try {
    const stored = localStorage.getItem(COOKIE_PREFERENCES_KEY);
    if (!stored) return { analytics: false };
    const parsed = JSON.parse(stored);
    return { analytics: parsed?.analytics === true, updatedAt: parsed?.updatedAt };
  } catch {
    return { analytics: false };
  }
}

export function hasStoredCookiePreferences() {
  try {
    const stored = localStorage.getItem(COOKIE_PREFERENCES_KEY);
    if (!stored) return false;
    return typeof JSON.parse(stored)?.analytics === 'boolean';
  } catch {
    return false;
  }
}

export function saveCookiePreferences(preferences: Pick<CookiePreferences, 'analytics'>) {
  const value: CookiePreferences = { ...preferences, updatedAt: new Date().toISOString() };
  localStorage.setItem(COOKIE_PREFERENCES_KEY, JSON.stringify(value));
  if (!value.analytics) localStorage.removeItem(ANALYTICS_VISITOR_KEY);
  return value;
}

export function hasAnalyticsConsent() {
  return getCookiePreferences().analytics;
}
