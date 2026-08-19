import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export default function CookiePolicy() {
  const { t } = useLanguage();
  const sections = Array.from({ length: 7 }, (_, index) => index + 1);

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 pb-24">
      <Link to="/" className="flex items-center gap-2 text-sm mb-6" style={{ color: 'var(--color-muted)' }}>
        <ArrowLeft size={16} /> {t('cookies.back')}
      </Link>
      <h1 className="font-serif text-3xl font-semibold mb-2" style={{ color: 'var(--color-text)' }}>{t('cookies.title')}</h1>
      <p className="text-sm mb-8" style={{ color: 'var(--color-muted)' }}>{t('cookies.lastUpdated')}</p>

      <div className="space-y-6 text-sm leading-relaxed" style={{ color: 'var(--color-text)' }}>
        <p style={{ color: 'var(--color-muted)' }}>{t('cookies.introduction')}</p>
        {sections.map((section) => (
          <section key={section}>
            <h2 className="font-serif text-lg font-semibold mb-2" style={{ color: 'var(--color-text)' }}>{t(`cookies.${section}.title`)}</h2>
            <p style={{ color: 'var(--color-muted)' }}>{t(`cookies.${section}.body`)}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
