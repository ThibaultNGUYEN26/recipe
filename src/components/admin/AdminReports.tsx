import { useEffect, useState } from 'react';
import { ArrowLeft, Flag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../lib/apiFetch';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { LoadingPan } from '../ui/LoadingPan';

type Report = { id: number; targetType: string; reason: string; notes: string | null; status: string; createdAt: string; reporter: { name: string | null; username: string | null }; targetUser?: { name: string | null; username: string | null }; targetRecipe?: { slug: string; translations: { title: string }[] }; targetComment?: { text: string; recipe: { slug: string } } };

export default function AdminReports() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const [status, setStatus] = useState('PENDING');
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.isAdmin) { setLoading(false); return; }
    setLoading(true);
    apiFetch(`/api/safety/admin/reports?status=${status}`).then((response) => response.ok ? response.json() : []).then(setReports).finally(() => setLoading(false));
  }, [user?.isAdmin, status]);

  async function update(id: number, nextStatus: string) {
    const response = await apiFetch(`/api/safety/admin/reports/${id}`, { method: 'PATCH', body: JSON.stringify({ status: nextStatus }) });
    if (response.ok) setReports((current) => current.filter((report) => report.id !== id));
  }

  if (authLoading || loading) return <div className="flex min-h-[60vh] items-center justify-center"><LoadingPan /></div>;
  if (!user?.isAdmin) return <div className="p-12 text-center">{t('adminReports.denied')}</div>;

  return <div className="mx-auto w-full max-w-3xl px-4 py-6 pb-28"><Link to="/" className="mb-5 inline-flex items-center gap-2 text-sm" style={{ color: 'var(--color-muted)' }}><ArrowLeft size={17} /> {t('adminReports.back')}</Link><div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><div className="mb-2 flex items-center gap-2 text-amber-800"><Flag size={20} /><span className="text-xs font-bold uppercase tracking-widest">{t('adminReports.eyebrow')}</span></div><h1 className="font-serif text-3xl font-bold">{t('adminReports.title')}</h1></div><select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border px-3 py-2 text-sm" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}><option value="PENDING">{t('adminReports.pending')}</option><option value="REVIEWED">{t('adminReports.reviewed')}</option><option value="DISMISSED">{t('adminReports.dismissed')}</option><option value="ACTIONED">{t('adminReports.actioned')}</option></select></div>{reports.length === 0 ? <div className="rounded-3xl border p-10 text-center text-sm" style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}>{t('adminReports.empty')}</div> : <div className="space-y-3">{reports.map((report) => { const target = report.targetUser?.name || report.targetUser?.username || report.targetRecipe?.translations[0]?.title || report.targetRecipe?.slug || report.targetComment?.text || report.targetType; return <article key={report.id} className="rounded-3xl border p-5" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}><div className="flex justify-between gap-3"><div><p className="text-xs font-bold uppercase text-amber-800">{report.targetType} · {report.reason}</p><h2 className="mt-1 font-semibold">{target}</h2><p className="mt-1 text-xs" style={{ color: 'var(--color-muted)' }}>{t('adminReports.by')} {report.reporter.name || report.reporter.username} · {new Date(report.createdAt).toLocaleDateString()}</p></div></div>{report.notes && <p className="mt-3 rounded-xl p-3 text-sm" style={{ backgroundColor: 'var(--color-bg)' }}>{report.notes}</p>}<div className="mt-4 flex flex-wrap gap-2"><button onClick={() => update(report.id, 'ACTIONED')} className="rounded-full bg-rose-700 px-4 py-2 text-xs font-bold text-white">{t('adminReports.action')}</button><button onClick={() => update(report.id, 'REVIEWED')} className="rounded-full bg-stone-900 px-4 py-2 text-xs font-bold text-white">{t('adminReports.review')}</button><button onClick={() => update(report.id, 'DISMISSED')} className="rounded-full border px-4 py-2 text-xs font-bold" style={{ borderColor: 'var(--color-border)' }}>{t('adminReports.dismiss')}</button></div></article>; })}</div>}</div>;
}
