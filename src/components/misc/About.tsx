import { Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, Heart } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export default function About() {
  const { t } = useLanguage();

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 pb-24">
      <Link to="/" className="flex items-center gap-2 text-sm mb-6" style={{ color: 'var(--color-muted)' }}>
        <ArrowLeft size={16} /> {t('about.back')}
      </Link>

      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3" style={{ color: '#92400e' }}>
          <BookOpen size={22} />
          <span className="text-xs font-bold uppercase tracking-widest">{t('about.eyebrow')}</span>
        </div>
        <h1 className="font-serif text-3xl font-semibold mb-3" style={{ color: 'var(--color-text)' }}>{t('about.title')}</h1>
        <p className="text-base leading-relaxed" style={{ color: 'var(--color-muted)' }}>{t('about.subtitle')}</p>
      </div>

      <div className="space-y-8 text-sm leading-relaxed">
        <section>
          <h2 className="font-serif text-xl font-semibold mb-3" style={{ color: 'var(--color-text)' }}>{t('about.story.title')}</h2>
          <div className="space-y-3" style={{ color: 'var(--color-muted)' }}>
            <p>{t('about.story.1')}</p>
            <p>{t('about.story.2')}</p>
            <p>{t('about.story.3')}</p>
          </div>
        </section>

        <section className="rounded-3xl border p-6" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <h2 className="font-serif text-xl font-semibold mb-3" style={{ color: 'var(--color-text)' }}>{t('about.name.title')}</h2>
          <div className="space-y-3" style={{ color: 'var(--color-muted)' }}>
            <p>{t('about.name.1')}</p>
            <p>{t('about.name.2')}</p>
          </div>
        </section>

        <section className="text-center pt-2">
          <Heart className="w-5 h-5 mx-auto mb-3" style={{ color: '#92400e' }} />
          <p className="font-serif text-lg font-semibold" style={{ color: 'var(--color-text)' }}>{t('about.closing')}</p>
        </section>
      </div>
    </div>
  );
}
