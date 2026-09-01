import { LoadingPan } from '../ui/LoadingPan';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BadgeCheck, ChefHat, CheckCircle2, Clock3, Copy, ExternalLink, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/UIContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { apiFetch } from '../../lib/apiFetch';

interface VerificationRequest {
  type: 'USER' | 'CHEF';
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  socialLinks: string[];
  message?: string | null;
  verificationCode: string;
  rejectionReason?: string | null;
  reviewedAt?: string | null;
}

export default function CreatorVerification() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const verificationType: 'USER' | 'CHEF' = searchParams.get('type')?.toUpperCase() === 'CHEF' ? 'CHEF' : 'USER';
  const isChef = verificationType === 'CHEF';
  const { showToast } = useUI();
  const { t } = useLanguage();
  const [request, setRequest] = useState<VerificationRequest | null>(null);
  const [linksText, setLinksText] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [tiktokUrl, setTiktokUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setRequest(null);
    setLinksText('');
    setInstagramUrl('');
    setTiktokUrl('');
    setYoutubeUrl('');
    setMessage('');
    apiFetch(`/api/verifications/me?type=${verificationType}`)
      .then((response) => response.json())
      .then((data) => {
        setRequest(data.request ?? null);
        if (data.request?.socialLinks) {
          setLinksText(data.request.socialLinks.join('\n'));
          for (const link of data.request.socialLinks as string[]) {
            try {
              const host = new URL(link).hostname.toLowerCase();
              if (host.includes('instagram.com')) setInstagramUrl(link);
              else if (host.includes('tiktok.com')) setTiktokUrl(link);
              else if (host.includes('youtube.com')) setYoutubeUrl(link);
            } catch { /* The API only returns validated links. */ }
          }
        }
        if (data.request?.message) setMessage(data.request.message);
      })
      .catch(() => showToast(t('verification.loadError'), undefined, 'error'))
      .finally(() => setLoading(false));
  }, [user?.id, showToast, verificationType]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const socialLinks = isChef
      ? linksText.split(/\r?\n/).map((link) => link.trim()).filter(Boolean)
      : [instagramUrl, tiktokUrl, youtubeUrl].map((link) => link.trim()).filter(Boolean);
    if (socialLinks.length === 0) {
      showToast(t(isChef ? 'verification.evidenceRequired' : 'verification.socialRequired'), undefined, 'error');
      return;
    }
    setSubmitting(true);
    try {
      const response = await apiFetch('/api/verifications', {
        method: 'POST',
        body: JSON.stringify({ type: verificationType, socialLinks, message }),
      });
      const data = await response.json();
      if (!response.ok) { showToast(data.error ?? t('verification.submitError'), undefined, 'error'); return; }
      setRequest(data.request);
      showToast(t('verification.submitted'));
    } catch {
      showToast(t('verification.submitError'), undefined, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function copyCode() {
    if (!request) return;
    await navigator.clipboard.writeText(request.verificationCode);
    showToast(t('verification.codeCopied'));
  }

  if (!user) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
      <p className="text-sm" style={{ color: 'var(--color-muted)' }}>{t('verification.signInPrompt')}</p>
      <Link to="/login" className="px-4 py-2 rounded-xl bg-stone-900 text-white text-sm">{t('verification.signIn')}</Link>
    </div>
  );

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><LoadingPan /></div>;

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-8 pb-24 space-y-5">
      <div>
        <h1 className="font-serif text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
          {isChef ? <ChefHat className="w-6 h-6 text-amber-700" /> : <BadgeCheck className="w-6 h-6 text-blue-500" />}
          {t(isChef ? 'verification.chefTitle' : 'verification.userTitle')}
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>{t(isChef ? 'verification.chefDescription' : 'verification.userDescription')}</p>
      </div>

      {request?.status === 'VERIFIED' || (isChef ? user.isChefVerified : user.isVerified) ? (
        <div className="rounded-3xl border border-blue-200 bg-blue-50 p-6 text-center space-y-2">
          <CheckCircle2 className="w-10 h-10 text-blue-500 mx-auto" />
          <h2 className="font-serif text-lg font-bold text-blue-950">{t(isChef ? 'verification.chefVerified' : 'verification.userVerified')}</h2>
          <p className="text-sm text-blue-800">{t(isChef ? 'verification.chefBadgeVisible' : 'verification.userBadgeVisible')}</p>
        </div>
      ) : request?.status === 'PENDING' ? (
        <div className="space-y-4">
          <div className="rounded-3xl border p-5" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center gap-2 mb-2"><Clock3 className="w-5 h-5 text-amber-700" /><h2 className="font-semibold">{t('verification.pending')}</h2></div>
            <p className="text-sm" style={{ color: 'var(--color-muted)' }}>{t(isChef ? 'verification.chefPendingHelp' : 'verification.userPendingHelp')}</p>
            <button onClick={copyCode} className="w-full mt-4 flex items-center justify-center gap-2 rounded-2xl bg-stone-900 text-white py-3 font-mono text-sm">
              {request.verificationCode} <Copy className="w-4 h-4" />
            </button>
          </div>
          <div className="rounded-3xl border p-5" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--color-muted)' }}>{t('verification.submittedProfiles')}</p>
            <div className="space-y-2">{request.socialLinks.map((link) => <a key={link} href={link} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-amber-800 underline break-all"><ExternalLink className="w-4 h-4 shrink-0" />{link}</a>)}</div>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="rounded-3xl border p-6 space-y-4" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          {request?.status === 'REJECTED' && (
            <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-800">
              <strong>{t('verification.previousRejected')}</strong>{request.rejectionReason && <p className="mt-1">{request.rejectionReason}</p>}
            </div>
          )}
          <div>
            <label className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>{t(isChef ? 'verification.professionalEvidence' : 'verification.publicProfiles')}</label>
            {isChef ? (
              <textarea value={linksText} onChange={(event) => setLinksText(event.target.value)} required rows={4}
                placeholder={t('verification.chefLinksPlaceholder')}
                className="w-full mt-1 rounded-2xl px-4 py-3 text-sm outline-none resize-none"
                style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
            ) : (
              <div className="mt-2 space-y-3">
                <input type="url" value={instagramUrl} onChange={(event) => setInstagramUrl(event.target.value)} placeholder={t('verification.instagramPlaceholder')}
                  aria-label={t('verification.instagramLabel')} className="w-full rounded-2xl px-4 py-3 text-sm outline-none"
                  style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
                <input type="url" value={tiktokUrl} onChange={(event) => setTiktokUrl(event.target.value)} placeholder={t('verification.tiktokPlaceholder')}
                  aria-label={t('verification.tiktokLabel')} className="w-full rounded-2xl px-4 py-3 text-sm outline-none"
                  style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
                <input type="url" value={youtubeUrl} onChange={(event) => setYoutubeUrl(event.target.value)} placeholder={t('verification.youtubePlaceholder')}
                  aria-label={t('verification.youtubeLabel')} className="w-full rounded-2xl px-4 py-3 text-sm outline-none"
                  style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
              </div>
            )}
            <p className="text-[11px] mt-1" style={{ color: 'var(--color-muted)' }}>{t(isChef ? 'verification.chefLinksHelp' : 'verification.userLinksHelp')}</p>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--color-muted)' }}>{t(isChef ? 'verification.chefBackground' : 'verification.userBackground')}</label>
            <textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={500} rows={3}
              placeholder={t(isChef ? 'verification.chefBackgroundPlaceholder' : 'verification.userBackgroundPlaceholder')}
              className="w-full mt-1 rounded-2xl px-4 py-3 text-sm outline-none resize-none"
              style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
          </div>
          <div className="flex items-start gap-2 rounded-2xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" /> {t(isChef ? 'verification.chefDisclaimer' : 'verification.userDisclaimer')}
          </div>
          <button disabled={submitting} className="w-full py-3 rounded-2xl bg-stone-900 text-white text-sm font-semibold disabled:opacity-50">{submitting ? t('verification.submitting') : t(isChef ? 'verification.applyChef' : 'verification.applyUser')}</button>
        </form>
      )}
    </div>
  );
}
