import { useEffect, useState } from 'react';
import { ArrowLeft, Download, Shield, Trash2, UserMinus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, setCsrfToken } from '../../lib/apiFetch';
import { useLanguage } from '../../contexts/LanguageContext';
import { useUI } from '../../contexts/UIContext';

type BlockedUser = { id: number; username: string | null; name: string | null; avatarUrl: string | null };

export default function PrivacySafety() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { showToast } = useUI();
  const [blocks, setBlocks] = useState<BlockedUser[]>([]);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    apiFetch('/api/safety/blocks').then((response) => response.ok ? response.json() : []).then(setBlocks).catch(() => {});
  }, []);

  async function exportData() {
    const response = await apiFetch('/api/privacy/export');
    if (!response.ok) return showToast(t('privacySettings.exportError'), undefined, 'error');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `savor-data-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    showToast(t('privacySettings.exportReady'));
  }

  async function unblock(userId: number) {
    const response = await apiFetch(`/api/safety/blocks/${userId}`, { method: 'DELETE' });
    if (response.ok) setBlocks((current) => current.filter((user) => user.id !== userId));
  }

  async function deleteAccount() {
    if (confirmation !== 'DELETE') return;
    setDeleting(true);
    const response = await apiFetch('/api/privacy/account', {
      method: 'DELETE',
      body: JSON.stringify({ confirmation, password }),
    });
    const result = await response.json().catch(() => ({}));
    setDeleting(false);
    if (!response.ok) return showToast(result.error || t('privacySettings.deleteError'), undefined, 'error');
    setCsrfToken(null);
    window.location.assign('/');
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-5 pb-28">
      <button onClick={() => navigate(-1)} className="mb-5 inline-flex items-center gap-2 text-sm" style={{ color: 'var(--color-muted)' }}><ArrowLeft size={17} /> {t('privacySettings.back')}</button>
      <div className="mb-7"><div className="mb-2 flex items-center gap-2 text-amber-800"><Shield size={20} /><span className="text-xs font-bold uppercase tracking-widest">{t('privacySettings.eyebrow')}</span></div><h1 className="font-serif text-3xl font-bold">{t('privacySettings.title')}</h1><p className="mt-2 text-sm" style={{ color: 'var(--color-muted)' }}>{t('privacySettings.subtitle')}</p></div>

      <section className="mb-6 rounded-3xl border p-5" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <Download className="mb-3 text-amber-800" size={22} /><h2 className="font-serif text-xl font-semibold">{t('privacySettings.exportTitle')}</h2><p className="my-2 text-sm" style={{ color: 'var(--color-muted)' }}>{t('privacySettings.exportDescription')}</p><button onClick={exportData} className="mt-2 min-h-11 rounded-full bg-stone-900 px-5 py-2 text-sm font-bold text-white">{t('privacySettings.exportButton')}</button>
      </section>

      <section className="mb-6 rounded-3xl border p-5" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <UserMinus className="mb-3 text-amber-800" size={22} /><h2 className="font-serif text-xl font-semibold">{t('privacySettings.blockedTitle')}</h2><p className="my-2 text-sm" style={{ color: 'var(--color-muted)' }}>{t('privacySettings.blockedDescription')}</p>
        {blocks.length === 0 ? <p className="mt-4 text-sm" style={{ color: 'var(--color-muted)' }}>{t('privacySettings.noBlocked')}</p> : <ul className="mt-4 divide-y" style={{ borderColor: 'var(--color-border)' }}>{blocks.map((user) => <li key={user.id} className="flex items-center gap-3 py-3"><span className="min-w-0 flex-1 text-sm font-semibold">{user.name || user.username || t('privacySettings.user')}</span><button onClick={() => unblock(user.id)} className="rounded-full border px-4 py-2 text-xs font-bold" style={{ borderColor: 'var(--color-border)' }}>{t('privacySettings.unblock')}</button></li>)}</ul>}
      </section>

      <section className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-rose-950">
        <Trash2 className="mb-3 text-rose-700" size={22} /><h2 className="font-serif text-xl font-semibold">{t('privacySettings.deleteTitle')}</h2><p className="my-2 text-sm text-rose-800">{t('privacySettings.deleteDescription')}</p>
        <label className="mt-4 block text-xs font-bold">{t('privacySettings.password')}</label><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm text-stone-900" />
        <label className="mt-3 block text-xs font-bold">{t('privacySettings.confirmation')}</label><input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="DELETE" className="mt-1 w-full rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm text-stone-900" />
        <button onClick={deleteAccount} disabled={confirmation !== 'DELETE' || deleting} className="mt-4 min-h-11 rounded-full bg-rose-700 px-5 py-2 text-sm font-bold text-white disabled:opacity-40">{deleting ? t('privacySettings.deleting') : t('privacySettings.deleteButton')}</button>
      </section>
    </div>
  );
}
