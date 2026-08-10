import { useUI } from '../../contexts/UIContext';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

const icons = {
  success: <CheckCircle2 size={18} className="text-green-600" />,
  error: <XCircle size={18} className="text-red-500" />,
  info: <Info size={18} className="text-amber-700" />,
};

export default function Toast() {
  const { toast, showToast: _ } = useUI();
  if (!toast) return null;

  return (
    <div
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-start gap-3 px-4 py-3 rounded-2xl shadow-lg max-w-sm w-[calc(100vw-2rem)]"
      style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
    >
      {icons[toast.type ?? 'success']}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{toast.title}</p>
        {toast.description && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>{toast.description}</p>
        )}
      </div>
    </div>
  );
}
