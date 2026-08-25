import { LoadingPan } from '../ui/LoadingPan';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bookmark, Eye, MessageCircle, Star, TrendingDown, TrendingUp, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { apiFetch } from '../../lib/apiFetch';

const API = import.meta.env.VITE_API_URL;

type MetricName = 'views' | 'saves' | 'followers';
type Trend = { value: number; change: number };
type Day = { date: string; views: number; saves: number; ratings: number; followers: number; comments: number };
type RecipePerformance = { slug: string; title: string; image: string | null; views: number; saves: number; ratings: number; avgRating: number | null; comments: number; followers: number };
type AnalyticsData = {
  range: { days: number; from: string; to: string };
  summary: { views: Trend; saves: Trend; ratings: Trend; followers: Trend; comments: Trend; uniqueViewers: number; avgRating: number | null; saveRate: number };
  series: Day[];
  topRecipes: RecipePerformance[];
  followSources: { slug: string | null; title: string; count: number }[];
};

const metricStyles: Record<MetricName, { labelKey: string; color: string }> = {
  views: { labelKey: 'creatorAnalytics.views', color: 'var(--analytics-views)' },
  saves: { labelKey: 'creatorAnalytics.saves', color: 'var(--analytics-saves)' },
  followers: { labelKey: 'creatorAnalytics.followers', color: 'var(--analytics-followers)' },
};

function formatNumber(value: number, language: string) {
  return new Intl.NumberFormat(language, { notation: value >= 10000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(value);
}

function imageSrc(url: string | null) {
  if (!url) return null;
  return url.startsWith('/') ? `${API}${url}` : url;
}

function TrendBadge({ change }: { change: number }) {
  const up = change >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${up ? 'analytics-positive' : 'analytics-negative'}`}>
      {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {Math.abs(change)}%
    </span>
  );
}

function LineChart({ data, metric, language, label, ariaLabel }: { data: Day[]; metric: MetricName; language: string; label: string; ariaLabel: string }) {
  const width = 760;
  const height = 230;
  const padding = 24;
  const values = data.map((day) => day[metric]);
  const max = Math.max(...values, 1);
  const points = values.map((value, index) => {
    const x = padding + (index / Math.max(values.length - 1, 1)) * (width - padding * 2);
    const y = height - padding - (value / max) * (height - padding * 2);
    return { x, y, value };
  });
  const path = points.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');
  const area = `${path} L ${points.at(-1)?.x ?? padding} ${height - padding} L ${padding} ${height - padding} Z`;
  const style = metricStyles[metric];

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible" role="img" aria-label={ariaLabel.replace('{metric}', label)}>
        <defs>
          <linearGradient id={`analytics-${metric}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={style.color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={style.color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((ratio) => <line key={ratio} x1={padding} x2={width - padding} y1={padding + ratio * (height - padding * 2)} y2={padding + ratio * (height - padding * 2)} stroke="var(--color-border)" strokeDasharray="4 6" />)}
        <path d={area} fill={`url(#analytics-${metric})`} />
        <path d={path} fill="none" stroke={style.color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point, index) => (data.length <= 30 || index % 3 === 0) && <circle key={index} cx={point.x} cy={point.y} r="3" fill={style.color}><title>{`${data[index].date}: ${point.value}`}</title></circle>)}
      </svg>
      <div className="flex justify-between text-[10px] font-medium -mt-1 px-2" style={{ color: 'var(--color-muted)' }}>
        <span>{new Date(data[0]?.date + 'T00:00:00').toLocaleDateString(language, { month: 'short', day: 'numeric' })}</span>
        <span>{new Date(data.at(-1)?.date + 'T00:00:00').toLocaleDateString(language, { month: 'short', day: 'numeric' })}</span>
      </div>
    </div>
  );
}

export default function CreatorAnalytics() {
  const { user, loading: authLoading } = useAuth();
  const { language, t } = useLanguage();
  const navigate = useNavigate();
  const [days, setDays] = useState(30);
  const [metric, setMetric] = useState<MetricName>('views');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!authLoading && !user) navigate('/login', { replace: true });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    apiFetch(`/api/users/me/analytics?days=${days}&lang=${language}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || t('creatorAnalytics.loadError'));
        setData(payload);
      })
      .catch((reason) => { if (reason.name !== 'AbortError') setError(reason.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [user, days, language, refreshKey]);

  useEffect(() => {
    const previous = document.title;
    document.title = `${t('creatorAnalytics.title')} — Savor`;
    return () => { document.title = previous; };
  }, [t]);

  const insight = useMemo(() => {
    if (!data?.topRecipes.length) return null;
    const top = data.topRecipes[0];
    if (top.views === 0) return t('creatorAnalytics.insightEmpty');
    if (top.saves / top.views >= 0.1) return t('creatorAnalytics.insightStrongSave', { title: top.title });
    return t('creatorAnalytics.insightMostViews', { title: top.title });
  }, [data, t]);

  if (authLoading || (loading && !data)) return <div className="min-h-[60vh] flex items-center justify-center"><LoadingPan /></div>;
  if (!user) return null;

  return (
    <div className="analytics-page w-full max-w-6xl mx-auto px-4 py-6 pb-28 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <Link to={user.username ? `/u/${encodeURIComponent(user.username)}` : `/profile/${user.id}`} className="inline-flex items-center gap-1 text-xs font-bold mb-3" style={{ color: 'var(--color-muted)' }}><ArrowLeft className="w-4 h-4" /> {t('creatorAnalytics.back')}</Link>
          <p className="analytics-accent text-[10px] uppercase tracking-[0.2em] font-black">{t('creatorAnalytics.studio')}</p>
          <h1 className="font-serif text-3xl font-black" style={{ color: 'var(--color-text)' }}>{t('creatorAnalytics.title')}</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>{t('creatorAnalytics.subtitle')}</p>
        </div>
        <div className="flex p-1 rounded-xl border self-start sm:self-auto" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          {[7, 30, 90].map((value) => <button key={value} onClick={() => setDays(value)} className={`analytics-range-button px-3 py-2 rounded-lg text-xs font-bold transition-colors ${days === value ? 'analytics-range-button--active' : ''}`}>{t('creatorAnalytics.days', { count: value })}</button>)}
        </div>
      </div>

      {error && <div className="analytics-error rounded-2xl border p-4 text-sm">{error} <button onClick={() => setRefreshKey((key) => key + 1)} className="font-bold underline ml-1">{t('creatorAnalytics.retry')}</button></div>}

      {data && <>
        <section className="responsive-single-column-narrow grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { label: t('creatorAnalytics.views'), trend: data.summary.views, icon: Eye, tone: 'var(--analytics-views)' },
            { label: t('creatorAnalytics.saves'), trend: data.summary.saves, icon: Bookmark, tone: 'var(--analytics-saves)' },
            { label: t('creatorAnalytics.newRatings'), trend: data.summary.ratings, icon: Star, tone: 'var(--analytics-ratings)' },
            { label: t('creatorAnalytics.newFollowers'), trend: data.summary.followers, icon: Users, tone: 'var(--analytics-followers)' },
            { label: t('creatorAnalytics.comments'), trend: data.summary.comments, icon: MessageCircle, tone: 'var(--analytics-comments)' },
          ].map(({ label, trend, icon: Icon, tone }) => <article key={label} className="rounded-2xl border p-4 shadow-sm" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between"><Icon className="w-4 h-4" style={{ color: tone }} /><TrendBadge change={trend.change} /></div>
            <p className="font-serif text-2xl font-black mt-3" style={{ color: 'var(--color-text)' }}>{formatNumber(trend.value, language)}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>{label}</p>
          </article>)}
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-[1.6fr_0.8fr] gap-4">
          <article className="rounded-3xl border p-5 sm:p-6 shadow-sm" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div><h2 className="font-serif text-xl font-bold">{t('creatorAnalytics.performance')}</h2><p className="text-xs" style={{ color: 'var(--color-muted)' }}>{t('creatorAnalytics.performanceSubtitle')}</p></div>
              <div className="flex flex-wrap gap-1">{(Object.keys(metricStyles) as MetricName[]).map((name) => <button key={name} onClick={() => setMetric(name)} className="px-3 py-1.5 rounded-full text-[10px] font-bold border" style={metric === name ? { backgroundColor: metricStyles[name].color, color: 'var(--analytics-active-text)', borderColor: metricStyles[name].color } : { color: 'var(--color-muted)', borderColor: 'var(--color-border)' }}>{t(metricStyles[name].labelKey)}</button>)}</div>
            </div>
            <LineChart data={data.series} metric={metric} language={language} label={t(metricStyles[metric].labelKey)} ariaLabel={t('creatorAnalytics.chartAria')} />
          </article>

          <aside className="analytics-insight-card rounded-3xl p-6 flex flex-col justify-between min-h-64">
            <div><p className="analytics-insight-eyebrow text-[10px] uppercase tracking-[0.2em] font-bold">{t('creatorAnalytics.atGlance')}</p><h2 className="font-serif text-xl font-bold mt-2">{t('creatorAnalytics.audienceQuality')}</h2></div>
            <div className="responsive-single-column-narrow grid grid-cols-2 gap-3 my-5">
              <div className="analytics-insight-stat"><p className="text-2xl font-black">{formatNumber(data.summary.uniqueViewers, language)}</p><p className="analytics-insight-muted text-[10px]">{t('creatorAnalytics.uniqueViewers')}</p></div>
              <div className="analytics-insight-stat"><p className="text-2xl font-black">{data.summary.saveRate.toFixed(1)}%</p><p className="analytics-insight-muted text-[10px]">{t('creatorAnalytics.saveRate')}</p></div>
              <div className="analytics-insight-stat"><p className="text-2xl font-black">{data.summary.avgRating?.toFixed(1) ?? '—'}</p><p className="analytics-insight-muted text-[10px]">{t('creatorAnalytics.allTimeRating')}</p></div>
              <div className="analytics-insight-stat"><p className="text-2xl font-black">{data.summary.views.value ? ((data.summary.followers.value / data.summary.views.value) * 100).toFixed(1) : '0.0'}%</p><p className="analytics-insight-muted text-[10px]">{t('creatorAnalytics.followConversion')}</p></div>
            </div>
            {insight && <p className="analytics-insight-copy text-xs leading-relaxed border-t pt-4">{insight}</p>}
          </aside>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-[1.5fr_0.7fr] gap-4">
          <article className="rounded-3xl border overflow-hidden" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <div className="p-5 border-b" style={{ borderColor: 'var(--color-border)' }}><h2 className="font-serif text-xl font-bold">{t('creatorAnalytics.recipePerformance')}</h2><p className="text-xs" style={{ color: 'var(--color-muted)' }}>{t('creatorAnalytics.ranked')}</p></div>
            {data.topRecipes.length ? <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left"><thead><tr className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-muted)', backgroundColor: 'var(--color-bg)' }}><th className="px-5 py-3">{t('creatorAnalytics.recipe')}</th><th>{t('creatorAnalytics.views')}</th><th>{t('creatorAnalytics.saves')}</th><th>{t('creatorAnalytics.rating')}</th><th>{t('creatorAnalytics.followers')}</th></tr></thead><tbody>{data.topRecipes.map((recipe) => <tr key={recipe.slug} className="border-t" style={{ borderColor: 'var(--color-border)' }}><td className="px-5 py-3"><Link to={`/recipe/${recipe.slug}`} className="flex items-center gap-3 font-bold text-xs"><div className="w-10 h-10 rounded-xl overflow-hidden bg-amber-100 shrink-0">{recipe.image && <img src={imageSrc(recipe.image)!} alt="" className="w-full h-full object-cover" />}</div><span className="max-w-52">{recipe.title}</span></Link></td><td className="text-xs font-bold">{formatNumber(recipe.views, language)}</td><td className="text-xs">{formatNumber(recipe.saves, language)}</td><td className="text-xs">{recipe.avgRating ? `${recipe.avgRating.toFixed(1)} (${recipe.ratings})` : '—'}</td><td className="text-xs">{recipe.followers}</td></tr>)}</tbody></table></div> : <div className="p-10 text-center text-sm" style={{ color: 'var(--color-muted)' }}>{t('creatorAnalytics.publishFirst')}</div>}
          </article>

          <article className="rounded-3xl border p-5" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <h2 className="font-serif text-xl font-bold">{t('creatorAnalytics.followSources')}</h2><p className="text-xs mb-5" style={{ color: 'var(--color-muted)' }}>{t('creatorAnalytics.followSourcesSubtitle')}</p>
            {data.followSources.length ? <div className="space-y-4">{data.followSources.map((source) => { const max = data.followSources[0].count || 1; return <div key={source.slug ?? 'direct'}><div className="flex justify-between gap-3 text-xs mb-1.5"><span className="font-semibold truncate">{source.title}</span><span className="font-bold">{source.count}</span></div><div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-bg)' }}><div className="h-full rounded-full bg-violet-600" style={{ width: `${Math.max(6, source.count / max * 100)}%` }} /></div></div>; })}</div> : <p className="text-sm py-8 text-center" style={{ color: 'var(--color-muted)' }}>{t('creatorAnalytics.noFollows')}</p>}
          </article>
        </section>
      </>}
    </div>
  );
}
