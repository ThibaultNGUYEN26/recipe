import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, MessageCircle, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL || 'contact.savor.recipe@gmail.com';

export default function Contact() {
  const { t } = useLanguage();

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 pb-24">
      <Link to="/" className="flex items-center gap-2 text-sm mb-6" style={{ color: 'var(--color-muted)' }}>
        <ArrowLeft size={16} /> {t('contact.back')}
      </Link>

      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3" style={{ color: '#92400e' }}>
          <MessageCircle size={22} />
          <span className="text-xs font-bold uppercase tracking-widest">{t('contact.eyebrow')}</span>
        </div>
        <h1 className="font-serif text-3xl font-semibold mb-3" style={{ color: 'var(--color-text)' }}>{t('contact.title')}</h1>
        <p className="text-base leading-relaxed" style={{ color: 'var(--color-muted)' }}>{t('contact.subtitle')}</p>
      </div>

      <section className="rounded-3xl border p-6 mb-6" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <Mail className="w-6 h-6 mb-4" style={{ color: '#92400e' }} />
        <h2 className="font-serif text-xl font-semibold mb-2" style={{ color: 'var(--color-text)' }}>{t('contact.email.title')}</h2>
        <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--color-muted)' }}>{t('contact.email.body')}</p>
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-900"
          style={{ backgroundColor: '#92400e' }}
        >
          {CONTACT_EMAIL}
        </a>
      </section>

      <section className="rounded-3xl border p-6" style={{ borderColor: 'var(--color-border)' }}>
        <ShieldCheck className="w-6 h-6 mb-4" style={{ color: '#92400e' }} />
        <h2 className="font-serif text-xl font-semibold mb-2" style={{ color: 'var(--color-text)' }}>{t('contact.privacy.title')}</h2>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-muted)' }}>{t('contact.privacy.body')}</p>
      </section>
    </div>
  );
}
