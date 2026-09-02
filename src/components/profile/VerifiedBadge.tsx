import { BadgeCheck } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export default function VerifiedBadge({ className = 'w-4 h-4', showLabel = false }: { className?: string; showLabel?: boolean }) {
  const { t } = useLanguage();

  return (
    <span
      className={`inline-flex shrink-0 items-center ${showLabel ? 'gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700' : ''}`}
      aria-label={t('verification.badgeAriaLabel')}
      title={t('verification.badgeTitle')}
      role="img"
    >
      <BadgeCheck className={`${className} shrink-0 fill-blue-50 text-blue-500`} aria-hidden="true" />
      {showLabel && <span>{t('verification.badgeLabel')}</span>}
    </span>
  );
}
