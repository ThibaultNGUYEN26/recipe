import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Cookie } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { hasStoredCookiePreferences, saveCookiePreferences } from '../../lib/cookiePreferences';

export default function CookieConsentBanner() {
  const { t } = useLanguage();
  const location = useLocation();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || location.pathname === '/cookie-settings' || hasStoredCookiePreferences()) return null;

  function choose(analytics: boolean) {
    saveCookiePreferences({ analytics });
    setDismissed(true);
  }

  return (
    <aside
      aria-label={t('cookieConsent.title')}
      className="cookie-consent-banner fixed z-[60] left-1/2 -translate-x-1/2 rounded-2xl border p-3 sm:p-4 shadow-2xl"
      style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      <div className="flex items-start gap-3">
        <Cookie className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#92400e' }} />
        <div className="min-w-0">
          <h2 className="font-serif text-base font-semibold" style={{ color: 'var(--color-text)' }}>{t('cookieConsent.title')}</h2>
          <p className="mt-0.5 text-xs leading-relaxed" style={{ color: 'var(--color-muted)' }}>
            {t('cookieConsent.body')}{' '}
            <Link to="/cookies" className="underline font-medium">{t('cookieConsent.policy')}</Link>{' · '}
            <Link to="/cookie-settings" className="underline font-medium">{t('cookieConsent.customize')}</Link>
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:justify-end">
        <button
          type="button"
          onClick={() => choose(false)}
          className="rounded-full bg-stone-800 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-900 transition-colors"
        >
          {t('cookieConsent.reject')}
        </button>
        <button
          type="button"
          onClick={() => choose(true)}
          className="rounded-full bg-amber-800 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-900 transition-colors"
        >
          {t('cookieConsent.accept')}
        </button>
      </div>
    </aside>
  );
}
