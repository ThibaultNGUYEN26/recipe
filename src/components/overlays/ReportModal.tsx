import { useState } from 'react';
import { useUI } from '../../contexts/UIContext';
import { X } from 'lucide-react';

const REASONS = ['Inappropriate content', 'Spam', 'Incorrect information', 'Copyright issue', 'Other'];

export default function ReportModal() {
  const { reportItem, closeReport } = useUI();
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!reportItem) return null;

  function submit() {
    setSubmitted(true);
    setTimeout(closeReport, 1500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40" onClick={closeReport}>
      <div
        className="w-full max-w-sm rounded-3xl p-6 space-y-4"
        style={{ backgroundColor: 'var(--color-surface)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg font-semibold" style={{ color: 'var(--color-text)' }}>Report</h2>
          <button onClick={closeReport} style={{ color: 'var(--color-muted)' }}><X size={20} /></button>
        </div>
        {submitted ? (
          <p className="text-center py-4 text-sm" style={{ color: 'var(--color-muted)' }}>Thanks for your report.</p>
        ) : (
          <>
            <div className="space-y-2">
              {REASONS.map((r) => (
                <label key={r} className="flex items-center gap-3 cursor-pointer">
                  <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} className="accent-amber-800" />
                  <span className="text-sm" style={{ color: 'var(--color-text)' }}>{r}</span>
                </label>
              ))}
            </div>
            <textarea
              placeholder="Additional notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-xl px-3 py-2 text-sm resize-none outline-none"
              style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
            />
            <button
              onClick={submit}
              disabled={!reason}
              className="w-full py-3 rounded-2xl font-medium text-sm text-white bg-stone-900 disabled:opacity-40 transition-opacity"
            >
              Submit report
            </button>
          </>
        )}
      </div>
    </div>
  );
}
