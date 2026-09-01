import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, Check, ChefHat, ChevronRight, Languages, Moon, Shield, Sun, UserRound } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import InstallApp from './InstallApp';

type ChoiceProps = {
  active: boolean;
  icon: ReactNode;
  label: string;
  description: string;
  onClick: () => void;
};

function Choice({ active, icon, label, description, onClick }: ChoiceProps) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[var(--color-hover)]">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: 'var(--color-subtle)', color: 'var(--color-text)' }}>
        {icon}
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

export default function SettingsPage() {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-5 pb-24">
      <div className="mb-7 flex items-center gap-3">
        <button type="button" onClick={() => navigate(-1)}
          className="rounded-full p-2 transition-colors hover:bg-[var(--color-hover)]" aria-label={t('settings.back')}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="font-serif text-2xl font-semibold" style={{ color: 'var(--color-text)' }}>{t('settings.title')}</h1>
          <p className="text-xs" style={{ color: 'var(--color-muted)' }}>{t('settings.subtitle')}</p>
        </div>
      </div>

      {user && (
      <section className="mb-7">
        <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>{t('settings.account')}</h2>
        <div className="overflow-hidden rounded-2xl border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <Link to="/settings/profile" className="flex items-center gap-3 px-4 py-4 transition-colors hover:bg-[var(--color-hover)]">
            <span className="flex h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: 'var(--color-subtle)' }}><UserRound size={19} /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{t('settings.editProfile')}</span>
              <span className="block text-xs" style={{ color: 'var(--color-muted)' }}>{t('settings.editProfileDescription')}</span>
            </span>
            <ChevronRight size={18} style={{ color: 'var(--color-muted)' }} />
          </Link>
          <Link to="/settings/privacy-safety" className="flex items-center gap-3 border-t px-4 py-4 transition-colors hover:bg-[var(--color-hover)]" style={{ borderColor: 'var(--color-border)' }}>
            <span className="flex h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: 'var(--color-subtle)' }}><Shield size={19} /></span>
            <span className="min-w-0 flex-1"><span className="block text-sm font-medium">{t('settings.privacySafety')}</span><span className="block text-xs" style={{ color: 'var(--color-muted)' }}>{t('settings.privacySafetyDescription')}</span></span>
            <ChevronRight size={18} style={{ color: 'var(--color-muted)' }} />
          </Link>
          <Link to="/settings/verification?type=CHEF" className="flex items-center gap-3 border-t px-4 py-4 transition-colors hover:bg-[var(--color-hover)]" style={{ borderColor: 'var(--color-border)' }}>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-amber-800"><ChefHat size={19} /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{user.isChefVerified ? 'Verified Chef status' : 'Apply for Verified Chef'}</span>
              <span className="block text-xs" style={{ color: 'var(--color-muted)' }}>{user.isChefVerified ? 'Your professional chef badge is active' : 'Submit professional culinary evidence for review'}</span>
            </span>
            {user.isChefVerified ? <Check size={18} className="text-emerald-600" /> : <ChevronRight size={18} style={{ color: 'var(--color-muted)' }} />}
          </Link>
          <Link to="/settings/verification?type=USER" className="flex items-center gap-3 border-t px-4 py-4 transition-colors hover:bg-[var(--color-hover)]" style={{ borderColor: 'var(--color-border)' }}>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600"><BadgeCheck size={19} /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{user.isVerified ? 'Verified User status' : 'Apply for Verified User'}</span>
              <span className="block text-xs" style={{ color: 'var(--color-muted)' }}>{user.isVerified ? 'Your blue identity badge is active' : 'Request the blue identity and authenticity badge'}</span>
            </span>
            {user.isVerified ? <Check size={18} className="text-emerald-600" /> : <ChevronRight size={18} style={{ color: 'var(--color-muted)' }} />}
          </Link>
        </div>
      </section>
      )}

      <section className="mb-7">
        <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>{t('settings.preferences')}</h2>
        <div className="overflow-hidden rounded-2xl border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <Link to="/settings/language" className="flex items-center gap-3 px-4 py-4 transition-colors hover:bg-[var(--color-hover)]">
            <span className="flex h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: 'var(--color-subtle)' }}><Languages size={19} /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{t('settings.language')}</span>
              <span className="block text-xs" style={{ color: 'var(--color-muted)' }}>{language === 'fr' ? 'Français' : language === 'es' ? 'Español' : language === 'vi' ? 'Tiếng Việt' : language === 'ar' ? 'العربية' : language === 'it' ? 'Italiano' : language === 'zh' ? '简体中文' : language === 'de' ? 'Deutsch' : language === 'ja' ? '日本語' : language === 'ko' ? '한국어' : language === 'pt' ? 'Português' : 'English'}</span>
            </span>
            <ChevronRight size={18} style={{ color: 'var(--color-muted)' }} />
          </Link>
        </div>
      </section>

      <InstallApp />

      <section>
        <div className="mb-2 px-1">
          <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>{t('settings.appearance')}</h2>
          <p className="mt-1 text-xs" style={{ color: 'var(--color-muted)' }}>{t('settings.appearanceDescription')}</p>
        </div>
        <div className="divide-y divide-[var(--color-border)] overflow-hidden rounded-2xl border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <Choice active={theme === 'light'} icon={<Sun size={18} />} label={t('settings.light')} description={t('settings.lightDescription')} onClick={() => setTheme('light')} />
          <Choice active={theme === 'dark'} icon={<Moon size={18} />} label={t('settings.dark')} description={t('settings.darkDescription')} onClick={() => setTheme('dark')} />
        </div>
      </section>
    </div>
  );
}
