import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export default function TermsOfService() {
  const { t } = useLanguage();
  const sections = Array.from({ length: 9 }, (_, index) => index + 1);

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 pb-24">
      <Link to="/" className="flex items-center gap-2 text-sm mb-6" style={{ color: 'var(--color-muted)' }}>
        <ArrowLeft size={16} /> {t('terms.back')}
      </Link>
      <h1 className="font-serif text-3xl font-semibold mb-2" style={{ color: 'var(--color-text)' }}>{t('terms.title')}</h1>
      <p className="text-sm mb-8" style={{ color: 'var(--color-muted)' }}>{t('terms.lastUpdated')}</p>

      <div className="space-y-6 text-sm leading-relaxed" style={{ color: 'var(--color-text)' }}>
        <p style={{ color: 'var(--color-muted)' }}>{t('terms.introduction')}</p>
        {sections.map((section) => (
          <section key={section}>
            <h2 className="font-serif text-lg font-semibold mb-2" style={{ color: 'var(--color-text)' }}>{t(`terms.${section}.title`)}</h2>
            <p style={{ color: 'var(--color-muted)' }}>{t(`terms.${section}.body`)}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
