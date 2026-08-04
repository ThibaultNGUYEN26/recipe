import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, Check, ExternalLink, ShieldX, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/UIContext';

const API = import.meta.env.VITE_API_URL;

interface ReviewItem {
  id: number;
  socialLinks: string[];
  message?: string | null;
  verificationCode: string;
  createdAt: string;
  user: { id: number; username: string | null; name: string | null; avatarUrl: string | null; isVerified: boolean };
}

export default function VerificationReview() {
  const { user } = useAuth();
  const { showToast } = useUI();
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.isAdmin) { setLoading(false); return; }
    fetch(`${API}/api/verifications/admin`, { credentials: 'include' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Failed to load requests');
        return response.json();
      })
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch(() => showToast('Failed to load verification requests', undefined, 'error'))
      .finally(() => setLoading(false));
  }, [user?.isAdmin, showToast]);

  async function review(item: ReviewItem, decision: 'VERIFIED' | 'REJECTED') {
    const rejectionReason = decision === 'REJECTED' ? window.prompt('Reason shown to the creator:')?.trim() : '';
    if (decision === 'REJECTED' && !rejectionReason) return;
    const response = await fetch(`${API}/api/verifications/admin/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ decision, rejectionReason }),
    });
    const data = await response.json();
    if (!response.ok) { showToast(data.error ?? 'Review failed', undefined, 'error'); return; }
    setItems((previous) => previous.filter((request) => request.id !== item.id));
    showToast(decision === 'VERIFIED' ? 'Creator verified' : 'Request rejected');
  }

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-amber-800 border-t-transparent animate-spin" /></div>;
  if (!user?.isAdmin) return <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3"><ShieldX className="w-10 h-10 text-rose-500" /><p>Administrator access required.</p><Link to="/" className="text-amber-800 underline">Go home</Link></div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 pb-24 space-y-5">
      <div><h1 className="font-serif text-2xl font-bold flex items-center gap-2"><BadgeCheck className="w-6 h-6 text-blue-500" /> Verification review</h1><p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>{items.length} pending request{items.length === 1 ? '' : 's'}</p></div>
      {items.length === 0 ? <div className="rounded-3xl border p-10 text-center" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>No pending requests.</div> : items.map((item) => (
        <article key={item.id} className="rounded-3xl border p-5 space-y-4" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="flex items-center justify-between gap-3"><div><Link to={item.user.username ? `/u/${item.user.username}` : `/profile/${item.user.id}`} className="font-bold hover:text-amber-800">{item.user.name ?? 'Creator'} {item.user.username && <span className="font-normal text-sm text-stone-500">@{item.user.username}</span>}</Link><p className="text-xs text-stone-500">Submitted {new Date(item.createdAt).toLocaleDateString()}</p></div><code className="text-xs bg-amber-50 text-amber-900 px-2 py-1 rounded-lg">{item.verificationCode}</code></div>
          {item.message && <p className="text-sm">{item.message}</p>}
          <div className="space-y-2">{item.socialLinks.map((link) => <a key={link} href={link} target="_blank" rel="noreferrer" className="flex gap-2 items-center text-sm text-amber-800 underline break-all"><ExternalLink className="w-4 h-4 shrink-0" />{link}</a>)}</div>
          <div className="grid grid-cols-2 gap-2 pt-2"><button onClick={() => review(item, 'REJECTED')} className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-50 text-rose-700 font-semibold text-sm"><X className="w-4 h-4" /> Reject</button><button onClick={() => review(item, 'VERIFIED')} className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm"><Check className="w-4 h-4" /> Verify</button></div>
        </article>
      ))}
    </div>
  );
}
