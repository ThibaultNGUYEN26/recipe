import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, ChefHat, Star, Trash2, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/UIContext';
import { apiFetch } from '../../lib/apiFetch';
import type { CommunityMake, CommunityMakesResponse } from '../../types';
import VerifiedBadge from '../profile/VerifiedBadge';

const API = import.meta.env.VITE_API_URL;
const SUGGESTED_CHANGES = [
  'Added chilli',
  'Swapped the protein',
  'Cooked it longer',
  'Used a dairy-free alternative',
  'Reduced the sugar',
  'Made it vegetarian',
];

function imageSrc(url: string | null) {
  if (!url) return null;
  return url.startsWith('/') ? `${API}${url}` : url;
}

function Contributor({ entry }: { entry: CommunityMake }) {
  return (
    <article className="rounded-2xl p-4" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-amber-800 text-white flex items-center justify-center text-xs font-bold overflow-hidden">
          {entry.author.avatarUrl
            ? <img src={imageSrc(entry.author.avatarUrl)!} alt="" className="w-full h-full object-cover" />
            : entry.author.name?.[0]?.toUpperCase() ?? '?'}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-sm font-semibold truncate" style={{ color: 'var(--color-text)' }}>
              {entry.author.name ?? entry.author.username ?? 'A Savor cook'} made this
            </span>
            {entry.author.isVerified && <VerifiedBadge className="w-3.5 h-3.5" />}
          </div>
          <span className="text-[11px]" style={{ color: 'var(--color-muted)' }}>{new Date(entry.createdAt).toLocaleDateString()}</span>
        </div>
      </div>
      {entry.rating && (
        <div className="flex mt-3" aria-label={`${entry.rating} out of 5 stars`}>
          {[1, 2, 3, 4, 5].map((star) => <Star key={star} size={15} className={star <= entry.rating! ? 'fill-amber-500 text-amber-500' : 'text-stone-300'} />)}
        </div>
      )}
      {(entry.changes ?? []).length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {entry.changes.map((change) => (
            <span key={change} className="rounded-full px-2.5 py-1 text-[11px] font-medium" style={{ backgroundColor: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}>
              {change}
            </span>
          ))}
        </div>
      )}
      {entry.note && <p className="text-sm leading-relaxed mt-2" style={{ color: 'var(--color-text)' }}>“{entry.note}”</p>}
    </article>
  );
}

interface Props {
  slug: string;
  recipeTitle: string;
  authorId?: number | null;
  initialCount: number;
  onCountChange: (count: number) => void;
}

export default function MadeItSection({ slug, recipeTitle, authorId, initialCount, onCountChange }: Props) {
  const { user } = useAuth();
  const { showToast } = useUI();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [note, setNote] = useState('');
  const [changes, setChanges] = useState<string[]>([]);
  const [customChange, setCustomChange] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data } = useQuery<CommunityMakesResponse>({
    queryKey: ['recipe-makes', slug],
    queryFn: async () => {
      const response = await apiFetch(`/api/recipes/${slug}/makes`);
      if (!response.ok) throw new Error('Could not load community makes');
      return response.json();
    },
  });

  const previewUrl = useMemo(() => photo ? URL.createObjectURL(photo) : null, [photo]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  useEffect(() => { if (data) onCountChange(data.count); }, [data?.count]);

  function showForm() {
    if (!user) {
      showToast('Sign in to share your version', undefined, 'info');
      return;
    }
    setRating(data?.myEntry?.rating ?? 0);
    setNote(data?.myEntry?.note ?? '');
    setChanges(data?.myEntry?.changes ?? []);
    setCustomChange('');
    setPhoto(null);
    setOpen(true);
  }

  async function submit() {
    setSubmitting(true);
    try {
      const form = new FormData();
      form.set('note', note.trim());
      form.set('changes', JSON.stringify(changes));
      if (rating) form.set('rating', String(rating));
      if (photo) form.set('photo', photo);
      const response = await apiFetch(`/api/recipes/${slug}/makes`, { method: 'POST', body: form });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        showToast('Could not share your version', result.error, 'error');
        return;
      }
      queryClient.setQueryData<CommunityMakesResponse>(['recipe-makes', slug], (old) => {
        const entries = old ? [result.entry, ...old.entries.filter((entry) => entry.id !== result.entry.id)] : [result.entry];
        return { count: result.count, entries, myEntry: result.entry };
      });
      onCountChange(result.count);
      setOpen(false);
      showToast(data?.myEntry ? 'Your version was updated' : 'You made it!');
    } finally {
      setSubmitting(false);
    }
  }

  async function remove() {
    setSubmitting(true);
    try {
      const response = await apiFetch(`/api/recipes/${slug}/makes`, { method: 'DELETE' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        showToast('Could not remove your version', result.error, 'error');
        return;
      }
      queryClient.setQueryData<CommunityMakesResponse>(['recipe-makes', slug], (old) => ({
        count: result.count,
        entries: old?.entries.filter((entry) => entry.id !== old.myEntry?.id) ?? [],
        myEntry: null,
      }));
      onCountChange(result.count);
      setOpen(false);
      showToast('Removed from community makes');
    } finally {
      setSubmitting(false);
    }
  }

  const entries = data?.entries ?? [];
  const photos = entries.filter((entry) => entry.imageUrl);
  const count = data?.count ?? initialCount;
  const popularChanges = [...entries.reduce((counts, entry) => {
    for (const change of entry.changes ?? []) counts.set(change, (counts.get(change) ?? 0) + 1);
    return counts;
  }, new Map<string, number>())].sort((a, b) => b[1] - a[1]);

  function toggleChange(change: string) {
    setChanges((current) => current.includes(change)
      ? current.filter((item) => item !== change)
      : current.length < 8 ? [...current, change] : current);
  }

  function addCustomChange() {
    const value = customChange.trim();
    if (!value || changes.includes(value) || changes.length >= 8) return;
    setChanges((current) => [...current, value]);
    setCustomChange('');
  }

  return (
    <section id="community-makes" className="order-4 lg:[grid-column:1] lg:[grid-row:3] scroll-mt-20 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-xl font-semibold" style={{ color: 'var(--color-text)' }}>Made by the community</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
            {count ? `${count.toLocaleString()} ${count === 1 ? 'cook has' : 'cooks have'} made this.` : 'Be the first to bring this recipe to life.'}
          </p>
        </div>
        {user?.id !== authorId && (
          <button onClick={showForm} className="shrink-0 flex items-center gap-2 rounded-full bg-amber-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-900">
            <ChefHat size={17} /> {data?.myEntry ? 'You made this' : 'I made this'}
          </button>
        )}
      </div>

      {popularChanges.length > 0 && (
        <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--color-accent-soft)', border: '1px solid var(--color-accent-soft-border)' }}>
          <h3 className="font-serif text-lg font-semibold" style={{ color: 'var(--color-text)' }}>Community variations</h3>
          <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>Ideas from cooks who made this recipe their own.</p>
          <div className="flex flex-wrap gap-2 mt-3">
            {popularChanges.map(([change, changeCount]) => (
              <span key={change} className="rounded-full bg-white/70 px-3 py-1.5 text-xs font-medium" style={{ color: 'var(--color-accent)' }}>
                {change}{changeCount > 1 && <strong className="ml-1.5">×{changeCount}</strong>}
              </span>
            ))}
          </div>
        </div>
      )}

      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {photos.slice(0, 6).map((entry) => (
            <figure key={entry.id} className="relative aspect-square overflow-hidden rounded-2xl">
              <img src={imageSrc(entry.imageUrl)!} alt={`${entry.author.name ?? 'Community member'}'s ${recipeTitle}`} loading="lazy" className="h-full w-full object-cover" />
              <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-8 text-xs font-medium text-white">
                {entry.author.name ?? entry.author.username ?? 'Savor cook'}
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      {entries.length > 0 && <div className="grid gap-3 sm:grid-cols-2">{entries.map((entry) => <Contributor key={entry.id} entry={entry} />)}</div>}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="made-it-title">
          <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl" style={{ backgroundColor: 'var(--color-bg)' }}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="made-it-title" className="font-serif text-xl font-semibold" style={{ color: 'var(--color-text)' }}>I made this</h2>
                <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>Share your version with the Savor community.</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close" className="p-1" style={{ color: 'var(--color-muted)' }}><X size={20} /></button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-semibold" style={{ color: 'var(--color-muted)' }}>How did it turn out? <span className="font-normal">Optional</span></label>
                <div className="flex mt-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} onClick={() => setRating(rating === star ? 0 : star)} aria-label={`${star} stars`} className="p-1">
                      <Star size={26} className={star <= rating ? 'fill-amber-500 text-amber-500' : 'text-stone-300'} />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold" style={{ color: 'var(--color-muted)' }}>What did you change? <span className="font-normal">Optional</span></label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {SUGGESTED_CHANGES.map((change) => (
                    <button key={change} type="button" onClick={() => toggleChange(change)} className="rounded-full border px-3 py-1.5 text-xs font-medium transition-colors" style={{ backgroundColor: changes.includes(change) ? 'var(--color-accent-soft)' : 'var(--color-surface)', borderColor: changes.includes(change) ? 'var(--color-accent)' : 'var(--color-border)', color: changes.includes(change) ? 'var(--color-accent)' : 'var(--color-text)' }}>
                      {change}
                    </button>
                  ))}
                  {changes.filter((change) => !SUGGESTED_CHANGES.includes(change)).map((change) => (
                    <button key={change} type="button" onClick={() => toggleChange(change)} className="rounded-full border px-3 py-1.5 text-xs font-medium" style={{ backgroundColor: 'var(--color-accent-soft)', borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }}>
                      {change} <span aria-hidden="true">×</span>
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <input value={customChange} onChange={(event) => setCustomChange(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addCustomChange(); } }} maxLength={80} placeholder="Another change…" className="min-w-0 flex-1 rounded-xl px-3 py-2 text-sm outline-none" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
                  <button type="button" onClick={addCustomChange} disabled={!customChange.trim() || changes.length >= 8} className="rounded-xl border px-3 text-xs font-semibold disabled:opacity-40" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>Add</button>
                </div>
              </div>
              <div>
                <label htmlFor="made-it-note" className="text-xs font-semibold" style={{ color: 'var(--color-muted)' }}>Tell us more <span className="font-normal">Optional</span></label>
                <textarea id="made-it-note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} rows={3} placeholder="I used chicken instead of beef and added a little more garlic…" className="mt-2 w-full resize-none rounded-2xl px-4 py-3 text-sm outline-none" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
                <p className="text-right text-[10px]" style={{ color: 'var(--color-muted)' }}>{note.length}/500</p>
              </div>
              <label className="block cursor-pointer rounded-2xl border border-dashed p-3 text-center" style={{ borderColor: 'var(--color-border)' }}>
                {previewUrl || data?.myEntry?.imageUrl ? (
                  <img src={previewUrl ?? imageSrc(data!.myEntry!.imageUrl)!} alt="Your recipe preview" className="mx-auto h-36 w-full rounded-xl object-cover" />
                ) : (
                  <span className="flex flex-col items-center gap-1 py-4 text-sm" style={{ color: 'var(--color-muted)' }}><Camera size={24} /> Add a photo <small>JPEG, PNG or WebP · 5 MB max</small></span>
                )}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => setPhoto(event.target.files?.[0] ?? null)} />
              </label>
            </div>

            <div className="mt-5 flex items-center gap-2">
              {data?.myEntry && <button onClick={remove} disabled={submitting} className="p-2.5 rounded-xl text-rose-600 disabled:opacity-50" aria-label="Remove your version"><Trash2 size={18} /></button>}
              <button onClick={submit} disabled={submitting} className="ml-auto rounded-full bg-amber-800 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                {submitting ? 'Sharing…' : data?.myEntry ? 'Update my version' : 'Share my version'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
