import { useUI } from '../../contexts/UIContext';
import { X, Link2, Check } from 'lucide-react';
import { useState } from 'react';

export default function ShareModal() {
  const { shareSlug, closeShare } = useUI();
  const [copied, setCopied] = useState(false);

  if (!shareSlug) return null;

  const url = `${window.location.origin}/recipe/${shareSlug}`;

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40" onClick={closeShare}>
      <div
        className="w-full max-w-sm rounded-3xl p-6 space-y-4"
        style={{ backgroundColor: 'var(--color-surface)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg font-semibold" style={{ color: 'var(--color-text)' }}>Share recipe</h2>
          <button onClick={closeShare} style={{ color: 'var(--color-muted)' }}><X size={20} /></button>
        </div>
        <div
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm truncate"
          style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-muted)' }}
        >
          <Link2 size={14} />
          <span className="flex-1 truncate">{url}</span>
        </div>
        <button
          onClick={copy}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-medium text-sm text-white bg-stone-900 transition-opacity active:opacity-80"
        >
          {copied ? <Check size={16} /> : <Link2 size={16} />}
          {copied ? 'Copied!' : 'Copy link'}
        </button>
      </div>
    </div>
  );
}
