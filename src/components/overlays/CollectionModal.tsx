import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useUI } from '../../contexts/UIContext';
import { useAuth } from '../../contexts/AuthContext';
import type { SavedCategory } from '../../types';
import { X, BookmarkPlus, Check, Folder, Plus } from 'lucide-react';
import { apiFetch } from '../../lib/apiFetch';

export default function CollectionModal() {
  const { saveModalSlug, closeSaveModal, showToast } = useUI();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [categories, setCategories] = useState<SavedCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!saveModalSlug || !user) return;
    setSelectedCategoryId(null);
    setNewCategoryName('');
    setLoadingCategories(true);
    apiFetch('/api/users/me/saved-categories')
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load categories');
        return res.json();
      })
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => showToast('Failed to load saved categories', undefined, 'error'))
      .finally(() => setLoadingCategories(false));
  }, [saveModalSlug, user?.id, showToast]);

  if (!saveModalSlug || !user) return null;

  async function createCategory() {
    const name = newCategoryName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const res = await apiFetch('/api/users/me/saved-categories', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error ?? 'Failed to create category', undefined, 'error');
        return;
      }
      setCategories((previous) => [...previous, data].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedCategoryId(data.id);
      setNewCategoryName('');
    } catch {
      showToast('Failed to create category', undefined, 'error');
    } finally {
      setCreating(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      const res = await apiFetch(`/api/recipes/${saveModalSlug}/save`, {
        method: 'POST',
        body: JSON.stringify({ savedCategoryId: selectedCategoryId }),
      });
      const data = await res.json();
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ['saved'] });
        window.dispatchEvent(new CustomEvent('recipe-saved', {
          detail: { slug: saveModalSlug, savedCategoryId: data.savedCategoryId ?? null },
        }));
        showToast(selectedCategoryId ? 'Recipe saved to category!' : 'Recipe saved!', undefined, 'success');
        closeSaveModal();
      } else {
        showToast(data.error ?? 'Failed to save', undefined, 'error');
      }
    } catch {
      showToast('Failed to save', undefined, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="app-modal-backdrop fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={closeSaveModal}>
      <div
        className="app-modal-panel w-full max-w-sm rounded-3xl p-5 sm:p-6 space-y-4"
        style={{ backgroundColor: 'var(--color-surface)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-serif text-lg font-semibold" style={{ color: 'var(--color-text)' }}>Save recipe</h2>
          <button onClick={closeSaveModal} style={{ color: 'var(--color-muted)' }}><X size={20} /></button>
        </div>
        <>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-muted)' }}>
                Choose a category
              </p>
              {loadingCategories ? (
                <div className="h-16 rounded-2xl animate-pulse" style={{ backgroundColor: 'var(--color-border)' }} />
              ) : (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setSelectedCategoryId(null)}
                    className="w-full flex items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm"
                    style={{ borderColor: selectedCategoryId === null ? '#92400e' : 'var(--color-border)', color: 'var(--color-text)' }}
                  >
                    <BookmarkPlus size={17} className="text-amber-800" />
                    <span className="min-w-0 flex-1 text-left">Favorites</span>
                    {selectedCategoryId === null && <Check size={16} className="ml-auto text-amber-800" />}
                  </button>
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setSelectedCategoryId(category.id)}
                      className="w-full flex items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm"
                      style={{ borderColor: selectedCategoryId === category.id ? '#92400e' : 'var(--color-border)', color: 'var(--color-text)' }}
                    >
                      <Folder size={17} className="text-amber-800" />
                      <span className="min-w-0 flex-1 text-left">{category.name}</span>
                      {selectedCategoryId === category.id && <Check size={16} className="ml-auto text-amber-800" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <input
                value={newCategoryName}
                onChange={(event) => setNewCategoryName(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && createCategory()}
                maxLength={40}
                placeholder="New category"
                className="min-w-0 flex-1 px-4 py-2.5 rounded-2xl text-sm outline-none"
                style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
              />
              <button
                type="button"
                onClick={createCategory}
                disabled={creating || !newCategoryName.trim()}
                className="px-3 rounded-2xl bg-stone-900 text-white disabled:opacity-50"
                aria-label="Create category"
              >
                <Plus size={18} />
              </button>
            </div>

            <button
              onClick={save}
              disabled={saving || loadingCategories}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-medium text-sm text-white bg-amber-800 disabled:opacity-60 transition-opacity"
            >
              <BookmarkPlus size={16} />
              {saving ? 'Saving…' : 'Save recipe'}
            </button>
          </>
      </div>
    </div>
  );
}
