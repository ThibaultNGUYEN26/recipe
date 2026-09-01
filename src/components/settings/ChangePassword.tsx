import { FormEvent, useState } from 'react';
import { ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { apiFetch, setCsrfToken } from '../../lib/apiFetch';

export default function ChangePassword() {
  const { user, refreshUser } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  function toggleVisibility(field: string) {
    setVisibleFields((visible) => ({ ...visible, [field]: !visible[field] }));
  }

  if (!user) return <Navigate to="/login" replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (user.hasPassword && !currentPassword) return setError(t('password.currentRequired'));
    if (newPassword.length < 8) return setError(t('password.tooShort'));
    if (newPassword !== confirmation) return setError(t('password.mismatch'));
    if (currentPassword && currentPassword === newPassword) return setError(t('password.same'));

    setSubmitting(true);
    try {
      const response = await apiFetch('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || 'Could not change password');
      setCsrfToken(data.csrfToken ?? null);
      await refreshUser({ clearOnError: true });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmation('');
      setDone(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not change password');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-5 pb-24">
      <div className="mb-7 flex items-center gap-3">
        <button type="button" onClick={() => navigate('/settings')}
          className="rounded-full p-2 transition-colors hover:bg-[var(--color-hover)]" aria-label={t('password.back')}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="font-serif text-2xl font-semibold">{t('password.title')}</h1>
          <p className="text-xs" style={{ color: 'var(--color-muted)' }}>{t('password.subtitle')}</p>
        </div>
      </div>

      <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        {done ? (
          <div className="flex flex-col items-center py-5 text-center">
            <CheckCircle2 size={42} className="mb-3 text-emerald-600" />
            <h2 className="font-serif text-xl font-semibold">{t('password.success')}</h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--color-muted)' }}>{t('password.successDescription')}</p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            {!user.hasPassword && (
              <div className="flex gap-3 rounded-xl bg-blue-50 p-3 text-sm text-blue-900">
                <KeyRound size={18} className="mt-0.5 shrink-0" />
                <p>{t('password.googleHint')}</p>
              </div>
            )}
            {user.hasPassword && (
              <div>
                <label htmlFor="current-password" className="text-sm font-medium">{t('password.current')}</label>
                <div className="relative mt-1.5">
                  <input id="current-password" type={visibleFields.current ? 'text' : 'password'} required autoComplete="current-password" value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    className="w-full rounded-xl border py-3 pl-4 pr-12 outline-none focus:ring-2 focus:ring-amber-600/30"
                    style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)' }} />
                  <button type="button" onClick={() => toggleVisibility('current')}
                    className="absolute inset-y-0 right-0 flex w-12 items-center justify-center"
                    aria-label={t(visibleFields.current ? 'password.hide' : 'password.show')}
                    aria-pressed={Boolean(visibleFields.current)}>
                    {visibleFields.current ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}
            <div>
              <label htmlFor="new-password" className="text-sm font-medium">{t('password.new')}</label>
              <div className="relative mt-1.5">
                <input id="new-password" type={visibleFields.new ? 'text' : 'password'} required minLength={8} autoComplete="new-password" value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="w-full rounded-xl border py-3 pl-4 pr-12 outline-none focus:ring-2 focus:ring-amber-600/30"
                  style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)' }} />
                <button type="button" onClick={() => toggleVisibility('new')}
                  className="absolute inset-y-0 right-0 flex w-12 items-center justify-center"
                  aria-label={t(visibleFields.new ? 'password.hide' : 'password.show')}
                  aria-pressed={Boolean(visibleFields.new)}>
                  {visibleFields.new ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="confirm-password" className="text-sm font-medium">{t('password.confirm')}</label>
              <div className="relative mt-1.5">
                <input id="confirm-password" type={visibleFields.confirm ? 'text' : 'password'} required minLength={8} autoComplete="new-password" value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  className="w-full rounded-xl border py-3 pl-4 pr-12 outline-none focus:ring-2 focus:ring-amber-600/30"
                  style={{ backgroundColor: 'var(--color-bg)', borderColor: 'var(--color-border)' }} />
                <button type="button" onClick={() => toggleVisibility('confirm')}
                  className="absolute inset-y-0 right-0 flex w-12 items-center justify-center"
                  aria-label={t(visibleFields.confirm ? 'password.hide' : 'password.show')}
                  aria-pressed={Boolean(visibleFields.confirm)}>
                  {visibleFields.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={submitting}
              className="w-full rounded-xl bg-stone-900 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
              {submitting ? t('password.submitting') : t('password.submit')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
