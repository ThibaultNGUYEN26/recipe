import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BarChart3, Check, Cookie, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useUI } from '../../contexts/UIContext';
import { getCookiePreferences, saveCookiePreferences } from '../../lib/cookiePreferences';

export default function CookieSettings() {
  const { t } = useLanguage();
  const { showToast } = useUI();
  const [analytics, setAnalytics] = useState(() => getCookiePreferences().analytics);

  function persist(nextAnalytics: boolean) {
    setAnalytics(nextAnalytics);
    saveCookiePreferences({ analytics: nextAnalytics });
    showToast(t('cookieSettings.saved'), t('cookieSettings.savedDescription'));
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 pb-24">
      <Link to="/" className="flex items-center gap-2 text-sm mb-6" style={{ color: 'var(--color-muted)' }}>
        <ArrowLeft size={16} /> {t('cookieSettings.back')}
      </Link>

      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3" style={{ color: '#92400e' }}>
          <Cookie size={22} />
          <span className="text-xs font-bold uppercase tracking-widest">{t('cookieSettings.eyebrow')}</span>
        </div>
        <h1 className="font-serif text-3xl font-semibold mb-3" style={{ color: 'var(--color-text)' }}>{t('cookieSettings.title')}</h1>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-muted)' }}>{t('cookieSettings.subtitle')}</p>
      </div>

      <div className="space-y-4">
        <section className="rounded-3xl border p-5" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="flex items-start gap-4">
            <ShieldCheck className="w-6 h-6 shrink-0 mt-0.5" style={{ color: '#92400e' }} />
            <div className="flex-1">
              <div className="flex items-center justify-between gap-3 mb-2">
                <h2 className="font-serif text-lg font-semibold" style={{ color: 'var(--color-text)' }}>{t('cookieSettings.essential.title')}</h2>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                  <Check size={14} /> {t('cookieSettings.alwaysActive')}
                </span>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-muted)' }}>{t('cookieSettings.essential.body')}</p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border p-5" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="flex items-start gap-4">
            <BarChart3 className="w-6 h-6 shrink-0 mt-0.5" style={{ color: '#92400e' }} />
            <div className="flex-1">
              <div className="flex items-center justify-between gap-4 mb-2">
                <h2 className="font-serif text-lg font-semibold" style={{ color: 'var(--color-text)' }}>{t('cookieSettings.analytics.title')}</h2>
                <button
                  type="button"
                  role="switch"
                  aria-checked={analytics}
                  aria-label={t('cookieSettings.analytics.toggle')}
                  onClick={() => setAnalytics((current) => !current)}
                  className="relative w-11 h-6 rounded-full shrink-0 transition-colors"
                  style={{ backgroundColor: analytics ? '#92400e' : 'var(--color-border)' }}
                >
                  <span className={`absolute top-1 left-0 w-4 h-4 rounded-full bg-white shadow transition-transform ${analytics ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-muted)' }}>{t('cookieSettings.analytics.body')}</p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border p-5" style={{ borderColor: 'var(--color-border)' }}>
          <h2 className="font-serif text-lg font-semibold mb-2" style={{ color: 'var(--color-text)' }}>{t('cookieSettings.local.title')}</h2>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-muted)' }}>{t('cookieSettings.local.body')}</p>
        </section>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mt-6">
        <button type="button" onClick={() => persist(analytics)} className="flex-1 rounded-full px-5 py-3 text-sm font-semibold text-white bg-amber-800 hover:bg-amber-900 transition-colors">
          {t('cookieSettings.save')}
        </button>
        <button type="button" onClick={() => persist(false)} className="flex-1 rounded-full border px-5 py-3 text-sm font-semibold transition-colors" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
          {t('cookieSettings.rejectOptional')}
        </button>
      </div>

      <p className="text-xs text-center mt-5" style={{ color: 'var(--color-muted)' }}>
        {t('cookieSettings.browserOnly')} <Link to="/cookies" className="underline">{t('cookieSettings.readPolicy')}</Link>
      </p>
    </div>
  );
}
