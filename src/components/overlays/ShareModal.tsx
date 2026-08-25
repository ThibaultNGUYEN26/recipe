import { useEffect, useState } from 'react';
import { useUI } from '../../contexts/UIContext';
import { X, Link2, Check, Share2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export default function ShareModal() {
  const { shareTarget, closeShare, showToast } = useUI();
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);

  useEffect(() => setCopied(false), [shareTarget]);

  if (!shareTarget) return null;

  const appBaseUrl = new URL(import.meta.env.BASE_URL, window.location.origin);
  const url = new URL(shareTarget.path.replace(/^\//, ''), appBaseUrl).toString();
  const canNativeShare = typeof navigator.share === 'function';

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast(t('share.copyError'), undefined, 'error');
    }
  }

  async function share() {
    try {
      await navigator.share({ title: shareTarget!.title, text: shareTarget!.text, url });
      closeShare();
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        showToast(t('share.openError'), undefined, 'error');
      }
    }
  }

  return (
    <div className="app-modal-backdrop fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={closeShare}>
      <div
        className="app-modal-panel w-full max-w-sm rounded-3xl p-5 sm:p-6 space-y-4"
        style={{ backgroundColor: 'var(--color-surface)' }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-serif text-lg font-semibold" style={{ color: 'var(--color-text)' }}>{t(shareTarget.type === 'profile' ? 'share.profileTitle' : 'share.recipeTitle')}</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>{shareTarget.title}</p>
          </div>
          <button onClick={closeShare} aria-label={t('share.close')} style={{ color: 'var(--color-muted)' }}><X size={20} /></button>
        </div>
        <div
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm"
          style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-muted)' }}
        >
          <Link2 size={14} className="shrink-0" />
          <span className="flex-1 [overflow-wrap:anywhere]">{url}</span>
        </div>
        <div className={`responsive-single-column-narrow grid gap-2 ${canNativeShare ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {canNativeShare && (
            <button onClick={share}
              className="flex items-center justify-center gap-2 py-3 rounded-2xl font-medium text-sm text-white bg-amber-800 active:opacity-80">
              <Share2 size={16} /> {t('share.action')}
            </button>
          )}
          <button onClick={copy}
            className="flex items-center justify-center gap-2 py-3 rounded-2xl font-medium text-sm text-white bg-stone-900 active:opacity-80">
            {copied ? <Check size={16} /> : <Link2 size={16} />}
            {t(copied ? 'share.copied' : 'share.copyLink')}
          </button>
        </div>
      </div>
    </div>
  );
}
