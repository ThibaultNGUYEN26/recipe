import { Download, Share } from 'lucide-react';
import { usePwaInstall } from '../../lib/pwa';

export default function InstallApp() {
  const { canPrompt, isiOS, isInstalled, install } = usePwaInstall();

  if (isInstalled || (!canPrompt && !isiOS)) return null;

  return (
    <section className="mb-7">
      <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>Install Savor</h2>
      <div className="rounded-2xl border p-4" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-950 text-white">
            <Download size={19} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Add Savor to your home screen</p>
            <p className="mt-1 text-xs leading-5" style={{ color: 'var(--color-muted)' }}>
              {isiOS && !canPrompt
                ? <>In Safari, tap <Share className="mx-1 inline" size={15} aria-label="Share" /> then <strong>Add to Home Screen</strong>.</>
                : 'Open Savor like an app, directly from your home screen.'}
            </p>
            {canPrompt && (
              <button type="button" onClick={() => void install()}
                className="mt-3 min-h-11 rounded-full bg-emerald-950 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-900">
                Install app
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
