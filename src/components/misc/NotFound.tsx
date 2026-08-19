import { ChefHat, Home, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';

export default function NotFound() {
  const { t } = useLanguage();

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12 pb-28">
      <section className="w-full max-w-xl text-center">
        <div
          className="relative mx-auto mb-7 flex h-28 w-28 items-center justify-center rounded-full border"
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <span className="font-serif text-5xl font-black text-amber-800" aria-hidden="true">4</span>
          <ChefHat className="mx-1 h-10 w-10 text-amber-700" aria-hidden="true" />
          <span className="font-serif text-5xl font-black text-amber-800" aria-hidden="true">4</span>
        </div>

        <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-amber-800">{t('notFound.eyebrow')}</p>
        <h1 className="mb-3 font-serif text-3xl font-black sm:text-4xl" style={{ color: 'var(--color-text)' }}>
          {t('notFound.title')}
        </h1>
        <p className="mx-auto mb-8 max-w-md text-sm leading-relaxed sm:text-base" style={{ color: 'var(--color-muted)' }}>
          {t('notFound.description')}
        </p>

        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            to="/"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-amber-800 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-amber-900"
          >
            <Home className="h-4 w-4" /> {t('notFound.home')}
          </Link>
          <Link
            to="/search"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border px-6 py-3 text-sm font-bold transition-colors hover:bg-amber-50"
            style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          >
            <Search className="h-4 w-4" /> {t('notFound.discover')}
          </Link>
        </div>
      </section>
    </div>
  );
}
