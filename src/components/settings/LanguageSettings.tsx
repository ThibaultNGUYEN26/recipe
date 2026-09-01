import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Languages } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

type LanguageChoiceProps = {
  active: boolean;
  label: string;
  description: string;
  onClick: () => void;
};

function LanguageChoice({ active, label, description, onClick }: LanguageChoiceProps) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-[var(--color-hover)]">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: 'var(--color-subtle)', color: 'var(--color-text)' }}>
        <Languages size={19} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium" style={{ color: 'var(--color-text)' }}>{label}</span>
        <span className="block text-xs" style={{ color: 'var(--color-muted)' }}>{description}</span>
      </span>
      <span className="flex h-5 w-5 items-center justify-center rounded-full border"
        style={{ borderColor: active ? 'var(--color-accent)' : 'var(--color-border)', backgroundColor: active ? 'var(--color-accent)' : 'transparent' }}>
        {active && <Check size={13} strokeWidth={3} style={{ color: 'var(--color-surface)' }} />}
      </span>
    </button>
  );
}

export default function LanguageSettings() {
  const { language, setPreferredLanguage, t } = useLanguage();
  const navigate = useNavigate();

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-5 pb-24">
      <div className="mb-7 flex items-center gap-3">
        <button type="button" onClick={() => navigate(-1)}
          className="rounded-full p-2 transition-colors hover:bg-[var(--color-hover)]" aria-label={t('language.back')}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="font-serif text-2xl font-semibold" style={{ color: 'var(--color-text)' }}>{t('language.title')}</h1>
          <p className="text-xs" style={{ color: 'var(--color-muted)' }}>{t('language.subtitle')}</p>
        </div>
      </div>

      <section className="mb-5 flex gap-3 rounded-2xl border p-4"
        style={{ backgroundColor: 'var(--color-accent-soft)', borderColor: 'var(--color-accent-soft-border)' }}>
        <Languages className="mt-0.5 h-5 w-5 shrink-0" style={{ color: 'var(--color-accent)' }} />
        <div>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{t('language.explanationTitle')}</h2>
          <p className="mt-1 text-xs leading-5" style={{ color: 'var(--color-muted)' }}>{t('language.explanation')}</p>
        </div>
      </section>

      <div className="divide-y divide-[var(--color-border)] overflow-hidden rounded-2xl border"
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <LanguageChoice active={language === 'ar'} label="العربية" description={t('language.arabicDescription')} onClick={() => setPreferredLanguage('ar')} />
        <LanguageChoice active={language === 'zh'} label="简体中文" description={t('language.chineseDescription')} onClick={() => setPreferredLanguage('zh')} />
        <LanguageChoice active={language === 'en'} label="English" description={t('language.englishDescription')} onClick={() => setPreferredLanguage('en')} />
        <LanguageChoice active={language === 'fr'} label="Français" description={t('language.frenchDescription')} onClick={() => setPreferredLanguage('fr')} />
        <LanguageChoice active={language === 'de'} label="Deutsch" description={t('language.germanDescription')} onClick={() => setPreferredLanguage('de')} />
        <LanguageChoice active={language === 'it'} label="Italiano" description={t('language.italianDescription')} onClick={() => setPreferredLanguage('it')} />
        <LanguageChoice active={language === 'ja'} label="日本語" description={t('language.japaneseDescription')} onClick={() => setPreferredLanguage('ja')} />
        <LanguageChoice active={language === 'ko'} label="한국어" description={t('language.koreanDescription')} onClick={() => setPreferredLanguage('ko')} />
        <LanguageChoice active={language === 'pt'} label="Português" description={t('language.portugueseDescription')} onClick={() => setPreferredLanguage('pt')} />
        <LanguageChoice active={language === 'es'} label="Español" description={t('language.spanishDescription')} onClick={() => setPreferredLanguage('es')} />
        <LanguageChoice active={language === 'vi'} label="Tiếng Việt" description={t('language.vietnameseDescription')} onClick={() => setPreferredLanguage('vi')} />
      </div>
    </div>
  );
}
