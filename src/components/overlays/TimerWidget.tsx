import { useUI } from '../../contexts/UIContext';
import { Timer, X } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

function fmt(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, '0');
  const sec = (s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
}

export default function TimerWidget() {
  const { activeTimer, stopTimer } = useUI();
  const { t } = useLanguage();
  if (!activeTimer) return null;

  const pct = activeTimer.totalSeconds > 0
    ? (activeTimer.remainingSeconds / activeTimer.totalSeconds) * 100
    : 0;

  return (
    <div
      className="app-fixed-widget fixed z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg"
      style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
    >
      <Timer size={18} className="text-amber-800 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>{activeTimer.title}</p>
        <p className="text-lg font-semibold tabular-nums" style={{ color: 'var(--color-text)' }}>{fmt(activeTimer.remainingSeconds)}</p>
        <div className="h-1 rounded-full bg-stone-200 mt-1 overflow-hidden">
          <div className="h-full bg-amber-800 rounded-full transition-all duration-1000" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <button onClick={stopTimer} className="shrink-0 p-2" aria-label={t('detail.stopTimer')} style={{ color: 'var(--color-muted)' }}>
        <X size={16} />
      </button>
    </div>
  );
}
