import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, CheckCircle2, Clock3, Copy, ExternalLink, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/UIContext';
import { apiFetch } from '../../lib/apiFetch';

interface VerificationRequest {
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  socialLinks: string[];
  message?: string | null;
  verificationCode: string;
  rejectionReason?: string | null;
  reviewedAt?: string | null;
}

export default function CreatorVerification() {
  const { user } = useAuth();
  const { showToast } = useUI();
  const [request, setRequest] = useState<VerificationRequest | null>(null);
  const [linksText, setLinksText] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [eligible, setEligible] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    apiFetch('/api/verifications/me')
      .then((response) => response.json())
      .then((data) => {
        setRequest(data.request ?? null);
        setEligible(Boolean(data.eligible));
        setFollowerCount(Number(data.followerCount) || 0);
        if (data.request?.socialLinks) setLinksText(data.request.socialLinks.join('\n'));
        if (data.request?.message) setMessage(data.request.message);
      })
      .catch(() => showToast('Failed to load verification status', undefined, 'error'))
      .finally(() => setLoading(false));
  }, [user?.id, showToast]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const socialLinks = linksText.split(/\r?\n/).map((link) => link.trim()).filter(Boolean);
    setSubmitting(true);
    try {
      const response = await apiFetch('/api/verifications', {
        method: 'POST',
        body: JSON.stringify({ socialLinks, message }),
      });
      const data = await response.json();
      if (!response.ok) { showToast(data.error ?? 'Submission failed', undefined, 'error'); return; }
      setRequest(data.request);
      showToast('Verification request submitted');
    } catch {
      showToast('Submission failed', undefined, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function copyCode() {
    if (!request) return;
    await navigator.clipboard.writeText(request.verificationCode);
    showToast('Verification code copied');
  }

  if (!user) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
      <p className="text-sm" style={{ color: 'var(--color-muted)' }}>Sign in to request creator verification.</p>
      <Link to="/login" className="px-4 py-2 rounded-xl bg-stone-900 text-white text-sm">Sign in</Link>
    </div>
  );

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-amber-800 border-t-transparent animate-spin" /></div>;

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-8 pb-24 space-y-5">
      <div>
        <h1 className="font-serif text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
          <BadgeCheck className="w-6 h-6 text-blue-500" /> Creator verification
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>Confirm that your Savor profile represents the creator behind your public accounts.</p>
      </div>

      {request?.status === 'VERIFIED' || user.isVerified ? (
        <div className="rounded-3xl border border-blue-200 bg-blue-50 p-6 text-center space-y-2">
          <CheckCircle2 className="w-10 h-10 text-blue-500 mx-auto" />
          <h2 className="font-serif text-lg font-bold text-blue-950">Your creator profile is verified</h2>
          <p className="text-sm text-blue-800">The verified badge is visible on your profile and recipes.</p>
        </div>
      ) : request?.status === 'PENDING' ? (
        <div className="space-y-4">
          <div className="rounded-3xl border p-5" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center gap-2 mb-2"><Clock3 className="w-5 h-5 text-amber-700" /><h2 className="font-semibold">Review pending</h2></div>
            <p className="text-sm" style={{ color: 'var(--color-muted)' }}>Temporarily place this code in the bio of at least one submitted account. An admin will use it to confirm ownership.</p>
            <button onClick={copyCode} className="w-full mt-4 flex items-center justify-center gap-2 rounded-2xl bg-stone-900 text-white py-3 font-mono text-sm">
              {request.verificationCode} <Copy className="w-4 h-4" />
            </button>
          </div>
          <div className="rounded-3xl border p-5" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--color-muted)' }}>Submitted profiles</p>
            <div className="space-y-2">{request.socialLinks.map((link) => <a key={link} href={link} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-amber-800 underline break-all"><ExternalLink className="w-4 h-4 shrink-0" />{link}</a>)}</div>
          </div>
        </div>
      ) : !eligible ? (
        <div className="rounded-3xl border p-6 text-center space-y-3" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <BadgeCheck className="w-10 h-10 mx-auto" style={{ color: 'var(--color-muted)' }} />
          <h2 className="font-serif text-lg font-bold">Verification unlocks after 1,500 followers</h2>
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>You currently have {followerCount.toLocaleString()} followers. The application becomes available once you reach 1,501.</p>
          <Link to={user.username ? `/u/${encodeURIComponent(user.username)}` : `/profile/${user.id}`} className="inline-block text-sm font-bold text-amber-800 underline">Back to profile</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="rounded-3xl border p-6 space-y-4" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          {request?.status === 'REJECTED' && (
            <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-800">
              <strong>Previous request was not approved.</strong>{request.rejectionReason && <p className="mt-1">{request.rejectionReason}</p>}
            </div>
          )}
          <div>
            <label className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>Public creator profiles</label>
            <textarea value={linksText} onChange={(event) => setLinksText(event.target.value)} required rows={4}
              placeholder={'https://instagram.com/yourname\nhttps://youtube.com/@yourname'}
              className="w-full mt-1 rounded-2xl px-4 py-3 text-sm outline-none resize-none"
              style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
            <p className="text-[11px] mt-1" style={{ color: 'var(--color-muted)' }}>One link per line, up to five. Profiles must be public.</p>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>Message (optional)</label>
            <textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={500} rows={3}
              placeholder="Tell us about your cooking content."
              className="w-full mt-1 rounded-2xl px-4 py-3 text-sm outline-none resize-none"
              style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
          </div>
          <div className="flex items-start gap-2 rounded-2xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" /> Verification confirms account ownership; it is not an endorsement of recipes or claims.
          </div>
          <button disabled={submitting} className="w-full py-3 rounded-2xl bg-stone-900 text-white text-sm font-semibold disabled:opacity-50">{submitting ? 'Submitting…' : 'Request verification'}</button>
        </form>
      )}
    </div>
  );
}
