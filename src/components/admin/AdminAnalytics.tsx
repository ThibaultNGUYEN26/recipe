import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, ArrowLeft, BookOpen, Bookmark, Eye, Heart,
  MessageCircle, ShieldCheck, ShieldX, Star, TrendingDown, TrendingUp, UserPlus, Users,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { apiFetch } from '../../lib/apiFetch';
import { LoadingPan } from '../ui/LoadingPan';

const API = import.meta.env.VITE_API_URL;

type Trend = { value: number; change: number };
type Metric = 'users' | 'recipes' | 'views' | 'interactions';
type Day = { date: string; users: number; recipes: number; views: number; interactions: number; activeUsers: number };
type TopRecipe = { slug: string; title: string; image: string | null; author: { id: number; username: string | null; name: string | null } | null; views: number; saves: number; likes: number; comments: number; ratingCount: number; avgRating: number | null };
type Creator = { id: number; username: string | null; name: string | null; avatarUrl: string | null; isVerified: boolean; recipeCount: number; followerCount: number };
type RecentUser = { id: number; username: string | null; name: string | null; avatarUrl: string | null; emailVerified: boolean; createdAt: string };
type AnalyticsData = {
  range: { days: number; from: string; to: string };
  totals: { users: number; verifiedUsers: number; verificationRate: number; recipes: number; publicRecipes: number; pendingVerifications: number };
  summary: { newUsers: Trend; newRecipes: Trend; views: Trend; interactions: Trend; activeUsers: number; saves: number; likes: number; ratings: number; comments: number; follows: number };
  series: Day[];
  topRecipes: TopRecipe[];
  topCreators: Creator[];
  recentUsers: RecentUser[];
};

function number(value: number) {
  return new Intl.NumberFormat(undefined, { notation: value >= 10000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(value);
}

function asset(url: string | null) {
  if (!url) return null;
  return url.startsWith('/') ? `${API}${url}` : url;
}

function TrendBadge({ change }: { change: number }) {
  const positive = change >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${positive ? 'analytics-positive' : 'analytics-negative'}`}>
      {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}{Math.abs(change)}%
    </span>
  );
}

function ActivityChart({ data, metric, label }: { data: Day[]; metric: Metric; label: string }) {
  const width = 800;
  const height = 240;
  const padding = 26;
  const values = data.map((day) => day[metric]);
  const maximum = Math.max(...values, 1);
  const points = values.map((value, index) => ({
    x: padding + (index / Math.max(values.length - 1, 1)) * (width - padding * 2),
    y: height - padding - (value / maximum) * (height - padding * 2),
    value,
  }));
  const path = points.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');
  const area = `${path} L ${points.at(-1)?.x ?? padding} ${height - padding} L ${padding} ${height - padding} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img" aria-label={label}>
      <defs><linearGradient id="admin-chart-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#b45309" stopOpacity="0.28" /><stop offset="100%" stopColor="#b45309" stopOpacity="0" /></linearGradient></defs>
      {[0, 0.5, 1].map((ratio) => <line key={ratio} x1={padding} x2={width - padding} y1={padding + ratio * (height - padding * 2)} y2={padding + ratio * (height - padding * 2)} stroke="var(--color-border)" strokeDasharray="4 6" />)}
      <path d={area} fill="url(#admin-chart-fill)" />
      <path d={path} fill="none" stroke="#b45309" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((point, index) => (data.length <= 30 || index % 3 === 0) && <circle key={data[index].date} cx={point.x} cy={point.y} r="3" fill="#b45309"><title>{data[index].date}: {point.value}</title></circle>)}
    </svg>
  );
}

export default function AdminAnalytics() {
  const { user, loading: authLoading } = useAuth();
  const { language, t } = useLanguage();
  const [days, setDays] = useState(30);
  const [metric, setMetric] = useState<Metric>('users');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.isAdmin) { setLoading(false); return; }
    const controller = new AbortController();
    setLoading(true);
    setError('');
    apiFetch(`/api/admin/analytics?days=${days}&lang=${language}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'Unable to load platform analytics');
        setData(payload);
      })
      .catch((reason) => { if (reason.name !== 'AbortError') setError(reason.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [user?.isAdmin, days, language]);

  const metrics = [
    { key: 'users' as const, label: t('adminAnalytics.metric.users') },
    { key: 'recipes' as const, label: t('adminAnalytics.metric.recipes') },
    { key: 'views' as const, label: t('adminAnalytics.metric.views') },
    { key: 'interactions' as const, label: t('adminAnalytics.metric.interactions') },
  ];

  if (authLoading || (loading && !data)) return <div className="min-h-[60vh] flex items-center justify-center"><LoadingPan /></div>;
  if (!user?.isAdmin) return <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 px-4 text-center"><ShieldX className="w-10 h-10 text-rose-500" /><p>{t('adminAnalytics.denied')}</p><Link to="/" className="text-amber-800 underline">{t('adminAnalytics.home')}</Link></div>;

  return (
    <div className="analytics-page w-full max-w-6xl mx-auto px-4 py-6 pb-28 space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <Link to="/" className="inline-flex items-center gap-1 text-xs font-bold mb-3" style={{ color: 'var(--color-muted)' }}><ArrowLeft className="w-4 h-4" /> {t('adminAnalytics.back')}</Link>
          <p className="analytics-accent text-[10px] uppercase tracking-[0.2em] font-black">{t('adminAnalytics.eyebrow')}</p>
          <h1 className="font-serif text-3xl font-black" style={{ color: 'var(--color-text)' }}>{t('adminAnalytics.title')}</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>{t('adminAnalytics.subtitle')}</p>
        </div>
        <div className="flex p-1 rounded-xl border self-start sm:self-auto" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          {[7, 30, 90].map((value) => <button key={value} onClick={() => setDays(value)} className={`analytics-range-button px-3 py-2 rounded-lg text-xs font-bold transition-colors ${days === value ? 'analytics-range-button--active' : ''}`}>{t('adminAnalytics.days', { count: value })}</button>)}
        </div>
      </header>

      {error && <div className="analytics-error rounded-2xl border p-4 text-sm">{error}</div>}

      {data && <>
        <section className="responsive-single-column-narrow grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {[
            { label: t('adminAnalytics.totalUsers'), value: data.totals.users, trend: data.summary.newUsers, icon: Users },
            { label: t('adminAnalytics.activeUsers'), value: data.summary.activeUsers, icon: Activity },
            { label: t('adminAnalytics.publicRecipes'), value: data.totals.publicRecipes, trend: data.summary.newRecipes, icon: BookOpen },
            { label: t('adminAnalytics.views'), value: data.summary.views.value, trend: data.summary.views, icon: Eye },
            { label: t('adminAnalytics.interactions'), value: data.summary.interactions.value, trend: data.summary.interactions, icon: Heart },
            { label: t('adminAnalytics.verified'), value: `${data.totals.verificationRate.toFixed(0)}%`, icon: ShieldCheck },
          ].map(({ label, value, trend: itemTrend, icon: Icon }) => <article key={label} className="rounded-2xl border p-4 shadow-sm" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between"><Icon className="w-4 h-4 text-amber-700" />{itemTrend && <TrendBadge change={itemTrend.change} />}</div>
            <p className="font-serif text-2xl font-black mt-3" style={{ color: 'var(--color-text)' }}>{typeof value === 'number' ? number(value) : value}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>{label}</p>
          </article>)}
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-[1.55fr_0.75fr] gap-4">
          <article className="rounded-3xl border p-5 sm:p-6 shadow-sm" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div><h2 className="font-serif text-xl font-bold">{t('adminAnalytics.activity')}</h2><p className="text-xs" style={{ color: 'var(--color-muted)' }}>{t('adminAnalytics.activityDescription')}</p></div>
              <div className="flex flex-wrap gap-1">{metrics.map((item) => <button key={item.key} onClick={() => setMetric(item.key)} className="px-3 py-1.5 rounded-full text-[10px] font-bold border" style={metric === item.key ? { backgroundColor: '#92400e', color: '#fff', borderColor: '#92400e' } : { color: 'var(--color-muted)', borderColor: 'var(--color-border)' }}>{item.label}</button>)}</div>
            </div>
            <ActivityChart data={data.series} metric={metric} label={metrics.find((item) => item.key === metric)?.label ?? metric} />
            <div className="flex justify-between text-[10px] px-2" style={{ color: 'var(--color-muted)' }}><span>{new Date(data.range.from).toLocaleDateString(language)}</span><span>{new Date(data.range.to).toLocaleDateString(language)}</span></div>
          </article>

          <aside className="rounded-3xl border p-5" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <h2 className="font-serif text-xl font-bold">{t('adminAnalytics.engagement')}</h2>
            <p className="text-xs mb-5" style={{ color: 'var(--color-muted)' }}>{t('adminAnalytics.engagementDescription')}</p>
            <div className="responsive-single-column-narrow grid grid-cols-2 gap-3">
              {[
                { icon: Bookmark, label: t('adminAnalytics.saves'), value: data.summary.saves },
                { icon: Heart, label: t('adminAnalytics.likes'), value: data.summary.likes },
                { icon: Star, label: t('adminAnalytics.ratings'), value: data.summary.ratings },
                { icon: MessageCircle, label: t('adminAnalytics.comments'), value: data.summary.comments },
                { icon: UserPlus, label: t('adminAnalytics.follows'), value: data.summary.follows },
                { icon: ShieldCheck, label: t('adminAnalytics.pending'), value: data.totals.pendingVerifications },
              ].map(({ icon: MetricIcon, label, value }) => <div key={label} className="rounded-2xl border p-3" style={{ borderColor: 'var(--color-border)' }}><MetricIcon className="w-4 h-4 text-amber-700" /><p className="text-xl font-black mt-2">{number(value)}</p><p className="text-[10px]" style={{ color: 'var(--color-muted)' }}>{label}</p></div>)}
            </div>
          </aside>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-[1.5fr_0.8fr] gap-4">
          <article className="rounded-3xl border overflow-hidden" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="p-5 border-b" style={{ borderColor: 'var(--color-border)' }}><h2 className="font-serif text-xl font-bold">{t('adminAnalytics.topRecipes')}</h2></div>
            {data.topRecipes.length ? <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left"><thead><tr className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-muted)', backgroundColor: 'var(--color-bg)' }}><th className="px-5 py-3">{t('adminAnalytics.recipe')}</th><th>{t('adminAnalytics.views')}</th><th>{t('adminAnalytics.saves')}</th><th>{t('adminAnalytics.likes')}</th><th>{t('adminAnalytics.rating')}</th></tr></thead><tbody>{data.topRecipes.map((recipe) => <tr key={recipe.slug} className="border-t" style={{ borderColor: 'var(--color-border)' }}><td className="px-5 py-3"><Link to={recipe.author?.username ? `/${encodeURIComponent(recipe.author.username)}/${encodeURIComponent(recipe.slug)}` : `/recipe/${encodeURIComponent(recipe.slug)}`} className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl overflow-hidden shrink-0" style={{ backgroundColor: 'var(--color-bg)' }}>{recipe.image && <img src={asset(recipe.image)!} alt="" className="w-full h-full object-cover" />}</div><div><p className="text-xs font-bold max-w-52">{recipe.title}</p><p className="text-[10px]" style={{ color: 'var(--color-muted)' }}>{recipe.author?.name ?? recipe.author?.username ?? '—'}</p></div></Link></td><td className="text-xs font-bold">{number(recipe.views)}</td><td className="text-xs">{number(recipe.saves)}</td><td className="text-xs">{number(recipe.likes)}</td><td className="text-xs">{recipe.avgRating == null ? '—' : `${recipe.avgRating.toFixed(1)} (${recipe.ratingCount})`}</td></tr>)}</tbody></table></div> : <p className="p-8 text-center text-sm" style={{ color: 'var(--color-muted)' }}>{t('adminAnalytics.noRecipes')}</p>}
          </article>

          <div className="space-y-4">
            <article className="rounded-3xl border p-5" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}><h2 className="font-serif text-xl font-bold mb-4">{t('adminAnalytics.topCreators')}</h2><div className="space-y-3">{data.topCreators.map((creator) => <Link key={creator.id} to={creator.username ? `/u/${encodeURIComponent(creator.username)}` : `/profile/${creator.id}`} className="flex items-center gap-3"><div className="w-9 h-9 rounded-full overflow-hidden bg-amber-100 shrink-0">{creator.avatarUrl && <img src={asset(creator.avatarUrl)!} alt="" className="w-full h-full object-cover" />}</div><div className="min-w-0 flex-1"><p className="text-xs font-bold truncate">{creator.name ?? creator.username ?? t('adminAnalytics.creator')}</p><p className="text-[10px]" style={{ color: 'var(--color-muted)' }}>{t('adminAnalytics.creatorStats', { recipes: creator.recipeCount, followers: creator.followerCount })}</p></div></Link>)}</div></article>
            <article className="rounded-3xl border p-5" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}><h2 className="font-serif text-xl font-bold mb-4">{t('adminAnalytics.recentUsers')}</h2><div className="space-y-3">{data.recentUsers.map((recent) => <Link key={recent.id} to={recent.username ? `/u/${encodeURIComponent(recent.username)}` : `/profile/${recent.id}`} className="flex items-center gap-3"><div className="w-8 h-8 rounded-full overflow-hidden bg-amber-100 shrink-0">{recent.avatarUrl && <img src={asset(recent.avatarUrl)!} alt="" className="w-full h-full object-cover" />}</div><div className="min-w-0 flex-1"><p className="text-xs font-bold truncate">{recent.name ?? recent.username ?? t('adminAnalytics.user')}</p><p className="text-[10px]" style={{ color: 'var(--color-muted)' }}>{new Date(recent.createdAt).toLocaleDateString(language)}</p></div><span className={`w-2 h-2 rounded-full ${recent.emailVerified ? 'bg-emerald-500' : 'bg-stone-300'}`} title={recent.emailVerified ? t('adminAnalytics.emailVerified') : t('adminAnalytics.emailPending')} /></Link>)}</div></article>
          </div>
        </section>
      </>}
    </div>
  );
}
