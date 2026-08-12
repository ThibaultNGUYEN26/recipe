import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Search, SlidersHorizontal, Star, Clock, UserPlus, X,
  Sparkles, Flame, ChefHat
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import type { RecipeListItem } from '../../types';
import VerifiedBadge from '../profile/VerifiedBadge';
import { apiFetch } from '../../lib/apiFetch';

const API = import.meta.env.VITE_API_URL;

const CATEGORIES = [
  { name: 'Desserts & Baking', image: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=400&q=80', tag: 'cake' },
  { name: 'Main Dishes', image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80', tag: 'main-dishes' },
  { name: 'Breakfast & Brunch', image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400&q=80', tag: 'breakfast' },
  { name: 'Quick & Easy', image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&q=80', tag: 'quick' },
  { name: 'Vegetarian', image: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&q=80', tag: 'vegetarian' },
  { name: 'Street Food', image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&q=80', tag: 'snacks' },
];

const DIFFICULTY_OPTS = ['All', 'Facile', 'Moyen', 'Difficile'];
const TIME_OPTS = [15, 30, 60, 'Any'] as const;

interface UserResult { id: number; username: string | null; name: string | null; avatarUrl: string | null; isVerified: boolean }

function imgSrc(url: string | null | undefined) {
  if (!url) return null;
  return url.startsWith('/') ? `${API}${url}` : url;
}

export default function SearchDiscover() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<UserResult[]>([]);

  // Filters
  const [difficulty, setDifficulty] = useState('All');
  const [maxTime, setMaxTime] = useState<number | 'Any'>('Any');
  const [minRating, setMinRating] = useState<number | 'Any'>('Any');
  const [dietary, setDietary] = useState<string | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);

  const { data, isLoading: loading } = useQuery({
    queryKey: ['discover', language],
    queryFn: () =>
      Promise.all([
        apiFetch(`/api/recipes?lang=${language}`).then((r) => r.json()),
        apiFetch(`/api/recipes/recommended?lang=${language}`).then((r) => (r.ok ? r.json() : null)),
      ]).then(([all, recommendations]) => ({
        allRecipes: Array.isArray(all) ? (all as RecipeListItem[]) : [],
        discoveryRecipes: Array.isArray(recommendations?.trending) ? recommendations.trending : (Array.isArray(all) ? all : []),
      })),
  });

  const allRecipes: RecipeListItem[] = data?.allRecipes ?? [];
  const discoveryRecipes: RecipeListItem[] = data?.discoveryRecipes ?? [];

  // Fast, debounced creator search by @username or display name.
  useEffect(() => {
    if (!query.trim()) { setUsers([]); return; }
    const controller = new AbortController();
    const t = setTimeout(() => {
      apiFetch(`/api/users?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        .then((r) => r.json())
        .then((d) => setUsers(Array.isArray(d) ? d : []))
        .catch((error) => {
          if (!(error instanceof DOMException && error.name === 'AbortError')) console.error(error);
        });
    }, 150);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [query]);

  const q = query.toLowerCase().trim();

  const searchResults = allRecipes.filter((r) => {
    const matchesQuery = !q || (
      r.title?.toLowerCase().includes(q) ||
      r.description?.toLowerCase().includes(q) ||
      r.category.label.toLowerCase().includes(q) ||
      (r.tags as string[] | undefined)?.some((t) => t.toLowerCase().includes(q))
    );
    const matchesDifficulty = difficulty === 'All' ||
      (r.info as Record<string, string> | null | undefined)?.difficulty === difficulty;
    const matchesTime = maxTime === 'Any' || (() => {
      const t = (r.info as Record<string, string> | null | undefined)?.totalTime;
      return t ? parseInt(t) <= Number(maxTime) : false;
    })();
    const matchesRating = minRating === 'Any' || (r.avgRating ?? 0) >= Number(minRating);
    const matchesDietary = !dietary ||
      (r.tags as string[] | undefined)?.some((t) => t.toLowerCase() === dietary.toLowerCase());
    return matchesQuery && matchesDifficulty && matchesTime && matchesRating && matchesDietary;
  });

  const activeFilterCount = (difficulty !== 'All' ? 1 : 0) +
    (maxTime !== 'Any' ? 1 : 0) +
    (minRating !== 'Any' ? 1 : 0) +
    (dietary ? 1 : 0);

  function clearAll() {
    setDifficulty('All'); setMaxTime('Any'); setMinRating('Any'); setDietary(null); setQuery('');
  }

  const hasSearch = q.length > 0 || activeFilterCount > 0;

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-4 space-y-6 pb-16">

      {/* Search bar */}
      <div className="relative flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="discover-muted w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search recipes, ingredients, creators…"
            className="discover-input w-full text-sm rounded-2xl pl-11 pr-10 py-3 border shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-600/40 font-medium"
          />
          {query && (
            <button onClick={() => setQuery('')}
              className="discover-icon-button absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilterModal(true)}
          className={`discover-filter-trigger flex items-center gap-1.5 px-4 py-3 rounded-2xl border text-xs font-bold transition-all shadow-sm ${activeFilterCount > 0 ? 'discover-filter-trigger--active' : ''}`}>
          <SlidersHorizontal className="w-4 h-4" />
          <span className="hidden sm:inline">Filters</span>
          {activeFilterCount > 0 && (
            <span className="discover-filter-count w-4 h-4 rounded-full text-[10px] font-extrabold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Active filter chips */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {dietary && (
            <span className="discover-chip flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full border">
              {dietary} <X className="w-3.5 h-3.5 cursor-pointer" onClick={() => setDietary(null)} />
            </span>
          )}
          {difficulty !== 'All' && (
            <span className="discover-chip flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full border">
              {difficulty} <X className="w-3.5 h-3.5 cursor-pointer" onClick={() => setDifficulty('All')} />
            </span>
          )}
          {maxTime !== 'Any' && (
            <span className="discover-chip flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full border">
              ≤{maxTime}m <X className="w-3.5 h-3.5 cursor-pointer" onClick={() => setMaxTime('Any')} />
            </span>
          )}
          {minRating !== 'Any' && (
            <span className="discover-chip flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full border">
              ≥{minRating}★ <X className="w-3.5 h-3.5 cursor-pointer" onClick={() => setMinRating('Any')} />
            </span>
          )}
          <button onClick={clearAll} className="discover-danger text-xs font-semibold hover:underline px-2">
            Clear all
          </button>
        </div>
      )}

      {/* Discover categories (no query) */}
      {!hasSearch && (
        <section className="space-y-3">
          <h3 className="font-serif text-lg font-bold flex items-center gap-1.5" style={{ color: 'var(--color-text)' }}>
            <Sparkles className="discover-accent w-4 h-4" /> Discover Categories
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {CATEGORIES.map((cat) => (
              <button key={cat.tag} onClick={() => setQuery(cat.tag)}
                className="relative h-24 rounded-2xl overflow-hidden cursor-pointer group shadow-sm text-left">
                <img src={cat.image} alt={cat.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-stone-950/20 to-transparent flex items-end p-3">
                  <span className="text-xs font-bold text-white leading-tight drop-shadow-sm">{cat.name}</span>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Trending creators (no query) */}
      {!hasSearch && users.length === 0 && (
        <section className="space-y-3 pt-2">
          <h3 className="font-serif text-lg font-bold flex items-center gap-1.5" style={{ color: 'var(--color-text)' }}>
            <Flame className="discover-accent w-4 h-4" /> Trending Creators
          </h3>
          <TrendingCreators lang={language} />
        </section>
      )}

      {/* Creator results */}
      {users.length > 0 && (
        <section className="space-y-3">
          <h3 className="font-serif text-lg font-bold" style={{ color: 'var(--color-text)' }}>Creators</h3>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
            {users.map((u) => (
              <div key={u.id} className="discover-creator-card rounded-2xl p-3.5 border shadow-sm flex flex-col items-center text-center min-w-[140px] shrink-0">
                <div className="w-14 h-14 rounded-full bg-amber-800 text-white flex items-center justify-center text-xl font-bold mb-2 ring-2 ring-amber-600/30 overflow-hidden">
                  {u.avatarUrl ? <img src={imgSrc(u.avatarUrl)!} alt="" className="w-full h-full object-cover" /> : u.name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="flex items-center justify-center gap-1 w-full">
                  <h4 className="text-xs font-bold truncate">{u.name ?? (u.username ? `@${u.username}` : 'Creator')}</h4>
                  {u.isVerified && <VerifiedBadge className="w-3.5 h-3.5" />}
                </div>
                {u.username && <p className="discover-muted text-[10px] truncate w-full">@{u.username}</p>}
                <button onClick={() => navigate(u.username ? `/u/${encodeURIComponent(u.username)}` : `/profile/${u.id}`)}
                  className="discover-follow-button w-full mt-2.5 py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-colors">
                  <UserPlus className="w-3 h-3" /> Follow
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recipe results grid */}
      <section className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-lg font-bold" style={{ color: 'var(--color-text)' }}>
            {hasSearch ? `Results (${searchResults.length})` : 'Popular Recipes'}
          </h3>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl aspect-square animate-pulse" style={{ backgroundColor: 'var(--color-border)' }} />
            ))}
          </div>
        ) : searchResults.length === 0 && hasSearch ? (
          <div className="rounded-3xl p-10 text-center border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <Search className="w-10 h-10 mx-auto mb-2" style={{ color: 'var(--color-border)' }} />
            <h4 className="font-serif text-base font-bold" style={{ color: 'var(--color-text)' }}>No matching recipes</h4>
            <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>Try a different search or clear filters.</p>
            <button onClick={clearAll} className="discover-accent mt-3 text-xs font-semibold underline">Reset</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
            {(hasSearch ? searchResults : discoveryRecipes).map((r) => (
              <Link key={r.slug} to={`/recipe/${r.slug}`}
                className="recipe-card__image-placeholder group relative aspect-square rounded-2xl overflow-hidden shadow-sm border"
                style={{ borderColor: 'var(--color-border)' }}>
                {r.image ? (
                  <img src={imgSrc(r.image)!} alt={r.title ?? ''} loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="recipe-card__image-placeholder w-full h-full flex items-center justify-center text-3xl">🍽️</div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/20 to-transparent p-3 flex flex-col justify-end">
                  <p className="text-xs font-bold text-white line-clamp-1 group-hover:text-amber-300 transition-colors">{r.title}</p>
                  {r.authorName && <p className="text-[10px] text-stone-300 truncate">{r.authorName}</p>}
                  <div className="flex items-center justify-between mt-1 text-[10px] text-stone-200 font-medium">
                    {r.avgRating != null && (
                      <span className="flex items-center gap-0.5">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        {r.avgRating.toFixed(1)}
                      </span>
                    )}
                    {(r.info as Record<string, string> | null | undefined)?.totalTime && (
                      <span className="flex items-center gap-0.5">
                        <Clock className="w-3 h-3 text-stone-300" />
                        {(r.info as Record<string, string>).totalTime}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Filter modal */}
      {showFilterModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-900/60 backdrop-blur-sm"
          onClick={() => setShowFilterModal(false)}>
          <div className="discover-modal w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border max-h-[90vh] overflow-y-auto space-y-5"
            onClick={(e) => e.stopPropagation()}>
            <div className="discover-divider flex items-center justify-between pb-3 border-b">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="discover-accent w-5 h-5" />
                <h3 className="font-serif text-lg font-bold">Filter Recipes</h3>
              </div>
              <button onClick={() => setShowFilterModal(false)} className="discover-icon-button p-1.5 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="discover-muted text-xs font-semibold uppercase tracking-wider">Dietary Preferences</label>
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => setDietary(null)}
                  className={`discover-option px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${!dietary ? 'discover-option--active' : ''}`}>
                  All
                </button>
                {['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'low-carb', 'nut-free', 'keto'].map((d) => (
                  <button key={d} onClick={() => setDietary(dietary === d ? null : d)}
                    className={`discover-option px-3 py-1.5 rounded-xl text-xs font-semibold transition-all capitalize ${dietary === d ? 'discover-option--active' : ''}`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="discover-muted text-xs font-semibold uppercase tracking-wider">Difficulty</label>
              <div className="flex flex-wrap gap-1.5">
                {DIFFICULTY_OPTS.map((d) => (
                  <button key={d} onClick={() => setDifficulty(d)}
                    className={`discover-option px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${difficulty === d ? 'discover-option--active' : ''}`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="discover-muted text-xs font-semibold uppercase tracking-wider">
                Max Total Time: {maxTime === 'Any' ? 'Any' : `${maxTime} mins`}
              </label>
              <div className="flex gap-2">
                {TIME_OPTS.map((t) => (
                  <button key={t} onClick={() => setMaxTime(t as number | 'Any')}
                    className={`discover-option flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${maxTime === t ? 'discover-option--active' : ''}`}>
                    {t === 'Any' ? 'Any' : `<${t}m`}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="discover-muted text-xs font-semibold uppercase tracking-wider">Min Rating</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => setMinRating(minRating === n ? 'Any' : n)}>
                    <Star className={`w-6 h-6 ${minRating !== 'Any' && minRating >= n ? 'text-amber-500 fill-amber-500' : 'discover-rating-empty'}`} />
                  </button>
                ))}
              </div>
            </div>

            <div className="discover-divider flex items-center gap-3 pt-3 border-t">
              <button onClick={clearAll}
                className="discover-reset-button flex-1 py-3 text-xs font-semibold rounded-xl transition-colors">
                Reset
              </button>
              <button onClick={() => setShowFilterModal(false)}
                className="discover-primary-button flex-1 py-3 text-xs font-semibold rounded-xl transition-colors shadow-sm">
                Show Results
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TrendingCreators({ lang }: { lang: string }) {
  const [creators, setCreators] = useState<(UserResult & { recipeCount: number })[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    apiFetch('/api/users')
      .then((r) => r.json())
      .then(async (users: UserResult[]) => {
        const withCounts = await Promise.all(
          users.slice(0, 6).map(async (u) => {
            const res = await apiFetch(`/api/users/${u.id}`);
            const data = await res.json();
            return { ...u, recipeCount: data.recipeCount ?? 0 };
          })
        );
        setCreators(withCounts);
      })
      .catch(console.error);
  }, []);

  if (creators.length === 0) return null;

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
      {creators.map((u) => (
        <div key={u.id} className="discover-creator-card rounded-2xl p-3.5 border shadow-sm flex flex-col items-center text-center min-w-[150px] shrink-0">
          <div className="w-14 h-14 rounded-full bg-amber-800 text-white flex items-center justify-center text-xl font-bold mb-2 ring-2 ring-amber-600/30 overflow-hidden">
            {u.avatarUrl
              ? <img src={u.avatarUrl.startsWith('/') ? `${import.meta.env.VITE_API_URL}${u.avatarUrl}` : u.avatarUrl} alt="" className="w-full h-full object-cover" />
              : u.name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="flex items-center justify-center gap-1 w-full">
            <h4 className="text-xs font-bold truncate">{u.name ?? (u.username ? `@${u.username}` : 'Creator')}</h4>
            {u.isVerified && <VerifiedBadge className="w-3.5 h-3.5" />}
          </div>
          {u.username && <p className="discover-muted text-[10px] truncate w-full">@{u.username}</p>}
          <p className="discover-accent text-[10px] font-medium mt-0.5">{u.recipeCount} recipes</p>
          <button onClick={() => navigate(u.username ? `/u/${encodeURIComponent(u.username)}` : `/profile/${u.id}`)}
            className="discover-follow-button w-full mt-2.5 py-1.5 px-3 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1">
            <UserPlus className="w-3 h-3" /> Follow
          </button>
        </div>
      ))}
    </div>
  );
}
