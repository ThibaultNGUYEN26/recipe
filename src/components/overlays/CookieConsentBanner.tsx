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
      className="fixed z-[60] bottom-24 left-1/2 -translate-x-1/2 w-[calc(100%_-_2rem)] max-w-2xl rounded-3xl border p-5 shadow-2xl"
      style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      <div className="flex items-start gap-3">
        <Cookie className="w-6 h-6 shrink-0 mt-0.5" style={{ color: '#92400e' }} />
        <div>
          <h2 className="font-serif text-lg font-semibold" style={{ color: 'var(--color-text)' }}>{t('cookieConsent.title')}</h2>
          <p className="text-xs sm:text-sm leading-relaxed mt-1" style={{ color: 'var(--color-muted)' }}>
            {t('cookieConsent.body')}{' '}
            <Link to="/cookies" className="underline font-medium">{t('cookieConsent.policy')}</Link>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:flex sm:justify-end gap-2 mt-4">
        <Link
          to="/cookie-settings"
          className="col-span-2 sm:col-span-1 text-center rounded-full border px-4 py-2.5 text-xs font-semibold"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
        >
          {t('cookieConsent.customize')}
        </Link>
        <button
          type="button"
          onClick={() => choose(false)}
          className="rounded-full bg-stone-800 px-4 py-2.5 text-xs font-semibold text-white hover:bg-stone-900 transition-colors"
        >
          {t('cookieConsent.reject')}
        </button>
        <button
          type="button"
          onClick={() => choose(true)}
          className="rounded-full bg-amber-800 px-4 py-2.5 text-xs font-semibold text-white hover:bg-amber-900 transition-colors"
        >
          {t('cookieConsent.accept')}
        </button>
      </div>
    </aside>
  );
}
