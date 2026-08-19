import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useUI } from '../../contexts/UIContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/apiFetch';

const REASONS = ['inappropriate', 'spam', 'misinformation', 'copyright', 'harassment', 'other'] as const;

export default function ReportModal() {
  const { reportItem, closeReport, showToast } = useUI();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { setReason(''); setNotes(''); }, [reportItem]);
  if (!reportItem) return null;

  async function submit() {
    if (!user) return showToast(t('report.signIn'), undefined, 'error');
    setSubmitting(true);
    const response = await apiFetch('/api/safety/reports', { method: 'POST', body: JSON.stringify({ ...reportItem, reason, notes }) });
    const result = await response.json().catch(() => ({}));
    setSubmitting(false);
    if (!response.ok) return showToast(result.error || t('report.error'), undefined, 'error');
    closeReport();
    showToast(t('report.thanks'));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center" onClick={closeReport}>
      <div className="w-full max-w-sm space-y-4 rounded-3xl p-6" style={{ backgroundColor: 'var(--color-surface)' }} onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between"><h2 className="font-serif text-lg font-semibold">{t('report.title')}</h2><button onClick={closeReport} aria-label={t('report.close')} style={{ color: 'var(--color-muted)' }}><X size={20} /></button></div>
        <p className="text-xs" style={{ color: 'var(--color-muted)' }}>{t('report.description')}</p>
        <div className="space-y-2">{REASONS.map((item) => <label key={item} className="flex cursor-pointer items-center gap-3"><input type="radio" name="reason" checked={reason === item} onChange={() => setReason(item)} className="accent-amber-800" /><span className="text-sm">{t(`report.reason.${item}`)}</span></label>)}</div>
        <textarea maxLength={1000} placeholder={t('report.notes')} value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} className="w-full resize-none rounded-xl px-3 py-2 text-sm outline-none" style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
        <button onClick={submit} disabled={!reason || submitting} className="w-full rounded-2xl bg-stone-900 py-3 text-sm font-medium text-white disabled:opacity-40">{submitting ? t('report.submitting') : t('report.submit')}</button>
      </div>
    </div>
  );
}
