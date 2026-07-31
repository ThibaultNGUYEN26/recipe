import { useState } from 'react';
import { useUI } from '../../contexts/UIContext';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { X, BookmarkPlus, Check } from 'lucide-react';

const API = import.meta.env.VITE_API_URL;

export default function CollectionModal() {
  const { saveModalSlug, closeSaveModal, showToast } = useUI();
  const { user } = useAuth();
  const { language } = useLanguage();
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  if (!saveModalSlug || !user) return null;

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/recipes/${saveModalSlug}/save`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        setDone(true);
        showToast('Recipe saved!', undefined, 'success');
        setTimeout(closeSaveModal, 1000);
      } else {
        const d = await res.json();
        showToast(d.error ?? 'Already saved', undefined, 'info');
        closeSaveModal();
      }
    } catch {
      showToast('Failed to save', undefined, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40" onClick={closeSaveModal}>
      <div
        className="w-full max-w-sm rounded-3xl p-6 space-y-4"
        style={{ backgroundColor: 'var(--color-surface)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg font-semibold" style={{ color: 'var(--color-text)' }}>Save recipe</h2>
          <button onClick={closeSaveModal} style={{ color: 'var(--color-muted)' }}><X size={20} /></button>
        </div>
        {done ? (
          <div className="flex flex-col items-center gap-2 py-4">
            <Check size={32} className="text-green-500" />
            <p className="text-sm" style={{ color: 'var(--color-muted)' }}>Saved to your collection</p>
          </div>
        ) : (
          <>
            <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
              This will save the recipe to your personal collection.
            </p>
            <button
              onClick={save}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-medium text-sm text-white bg-amber-800 disabled:opacity-60 transition-opacity"
            >
              <BookmarkPlus size={16} />
              {saving ? 'Saving…' : 'Save recipe'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
