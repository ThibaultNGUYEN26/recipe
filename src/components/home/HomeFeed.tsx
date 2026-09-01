import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '../../contexts/LanguageContext';
import RecipeCard from './RecipeCard';
import type { RecipeListItem } from '../../types';
import { Sparkles, Flame, Clock, Leaf, UtensilsCrossed, Star, ArrowRight, Languages } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/apiFetch';
import { LoadingPan } from '../ui/LoadingPan';
import { useMinLoading } from '../../hooks/useMinLoading';

const API = import.meta.env.VITE_API_URL;

const DISCOVERY_FILTERS = [
  { key: 'trending', labelKey: 'home.trending', Icon: Flame },
  { key: 'quick', labelKey: 'home.quick', Icon: Clock },
  { key: 'vegetarian', labelKey: 'home.vegetarian', Icon: Leaf },
] as const;

function imgSrc(url: string | null | undefined) {
  if (!url) return null;
  return url.startsWith('/') ? `${API}${url}` : url;
}

function HeroCard({ recipe }: { recipe: RecipeListItem }) {
  const { t } = useLanguage();
  const info = recipe.info as Record<string, string> | null | undefined;
  return (
    <Link to={recipe.authorUsername ? `/${recipe.authorUsername}/${recipe.slug}` : `/recipe/${recipe.slug}`}
      className="relative rounded-3xl overflow-hidden bg-stone-900 text-white cursor-pointer shadow-xl group border border-stone-800 block">
      <div className="relative h-[240px] sm:h-[300px] lg:h-[340px] w-full">
        {recipe.image ? (
          <img src={imgSrc(recipe.image)!} alt={recipe.title ?? ''}
            style={{ objectPosition: '50% 50%' }}
            className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700 ease-out" />
        ) : (
          <div className="w-full h-full bg-stone-800 flex items-center justify-center text-6xl">🍽️</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/40 to-transparent" />
      </div>

      <div className="absolute bottom-0 inset-x-0 p-5 sm:p-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="bg-amber-600 text-white text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            {t('home.featured')}
          </span>
          {recipe.originalLanguage && (
            <span className="rounded-full bg-white/90 px-2 py-1 text-stone-900"
              title={t(`detail.language.${recipe.originalLanguage}`)}
              aria-label={t(`detail.language.${recipe.originalLanguage}`)}>
              <Languages className="h-3.5 w-3.5" />
            </span>
          )}
          {recipe.authorName && (
            <span className="text-stone-300 text-xs font-semibold">{t('home.by', { name: recipe.authorName })}</span>
          )}
        </div>
        <h2 className="font-serif text-2xl sm:text-3xl font-extrabold text-white leading-tight group-hover:text-amber-300 transition-colors">
          {recipe.title}
        </h2>
        {recipe.description && (
          <p className="text-stone-300 text-xs sm:text-sm line-clamp-2 mt-2 max-w-2xl font-light">
            {recipe.description}
          </p>
        )}
        <div className="flex items-center gap-4 text-xs font-medium text-stone-300 mt-4">
          {info?.totalTime && <span>⏱ {info.totalTime}</span>}
          {recipe.avgRating != null && (
            <><span>•</span><span>⭐ {t('home.rating', { rating: recipe.avgRating.toFixed(1) })}</span></>
          )}
          {recipe.ratingCount != null && recipe.ratingCount > 0 && (
            <><span>•</span><span>❤️ {t('home.loved', { count: recipe.ratingCount })}</span></>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function HomeFeed() {
  const { language, t } = useLanguage();
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState<'all' | 'following' | 'trending' | 'quick' | 'vegetarian'>('all');
  const [followedAuthorIds, setFollowedAuthorIds] = useState<Set<number>>(new Set());

  const { data, isLoading: loading } = useQuery({
    queryKey: ['feed', language, user?.id],
    queryFn: () =>
      apiFetch(`/api/recipes/recommended?lang=${language}`)
        .then(async (r) => {
          if (!r.ok) throw new Error('unavailable');
          return r.json();
        })
        .catch(() =>
          apiFetch(`/api/recipes?lang=${language}`)
            .then((r) => r.json())
            .then((d) => ({ personalized: Array.isArray(d) ? d : [], trending: [], following: [], personalizedForUser: false }))
        ),
  });

  const showLoader = useMinLoading(loading);
  const trending: RecipeListItem[] = data?.trending ?? [];
  const recipes: RecipeListItem[] = data?.personalized?.length ? data.personalized : trending;
  const following: RecipeListItem[] = data?.following ?? [];
  const isPersonalized = Boolean(data?.personalizedForUser);

  const sourceRecipes = activeFilter === 'trending' ? trending : activeFilter === 'following' ? following : recipes;
  const filteredRecipes = sourceRecipes.filter((r) => {
    if (activeFilter === 'quick') {
      const t = (r.info as Record<string, string> | null | undefined)?.totalTime;
      if (!t) return false;
      return parseInt(t) <= 30;
    }
    if (activeFilter === 'vegetarian') {
      return (r.tags as string[] | undefined)?.some((t) => /veg/i.test(t));
    }
    return true;
  });

  const featuredRecipe = filteredRecipes[0];
  const gridRecipes = filteredRecipes.slice(1);

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 space-y-6 pb-24 w-full">
      {!user && (
        <section className="relative overflow-hidden rounded-3xl border px-6 py-8 sm:px-10 sm:py-10"
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-accent-soft-border)' }}>
          <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-amber-200/30 blur-3xl" aria-hidden="true" />
          <div className="relative max-w-2xl">
            <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.18em] home-accent-text">
              {t('home.valueKicker')}
            </p>
            <h1 className="font-serif text-3xl font-extrabold leading-tight sm:text-4xl" style={{ color: 'var(--color-text)' }}>
              {t('home.valueTitle')}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 sm:text-base" style={{ color: 'var(--color-muted)' }}>
              {t('home.valueDescription')}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href="#recipe-feed" className="inline-flex items-center gap-2 rounded-full bg-amber-800 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-amber-900">
                {t('home.exploreRecipes')} <ArrowRight className="h-4 w-4" />
              </a>
              <Link to="/add-recipe" className="inline-flex items-center rounded-full border px-5 py-3 text-sm font-bold transition-colors hover:bg-[var(--color-hover)]"
                style={{ color: 'var(--color-text)', borderColor: 'var(--color-border)' }}>
                {t('home.shareRecipe')}
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Primary feeds */}
      <div id="recipe-feed" className="grid scroll-mt-24 grid-cols-2 rounded-2xl p-1" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        {[
          { key: 'all' as const, labelKey: 'home.forYou', Icon: Sparkles },
          { key: 'following' as const, labelKey: 'home.following', Icon: UtensilsCrossed },
        ].map(({ key, labelKey, Icon }) => (
          <button key={key} onClick={() => setActiveFilter(key)} className="flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all" style={(activeFilter === key || (key === 'all' && activeFilter !== 'following')) ? { backgroundColor: '#92400e', color: '#fff', boxShadow: '0 2px 8px rgba(146,64,14,.2)' } : { color: 'var(--color-muted)' }}>
            <Icon className="w-4 h-4" /> {t(labelKey)}
          </button>
        ))}
      </div>

      {/* Featured hero */}
      {featuredRecipe && activeFilter === 'all' && !showLoader && (
        <HeroCard recipe={featuredRecipe} />
      )}

      {(activeFilter === 'all' || activeFilter === 'following') && !showLoader && (
        <div className="responsive-stack-narrow flex items-center justify-between gap-3">
          <div>
            <h1 className="font-serif text-xl font-bold" style={{ color: 'var(--color-text)' }}>
              {activeFilter === 'following' ? t('home.followingTitle') : isPersonalized ? t('home.picked') : t('home.discover')}
            </h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
              {activeFilter === 'following' ? t('home.followingDescription') : isPersonalized ? t('home.personalizedDescription') : t('home.communityDescription')}
            </p>
          </div>
          {!user && activeFilter === 'all' && <Link to="/login" className="home-accent-text self-start text-xs font-bold">{t('home.signInPersonalize')}</Link>}
        </div>
      )}

      {/* Discovery shortcuts */}
      <div className="-mx-4 px-4 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b"
        style={{ borderColor: 'var(--color-border)' }}>
        {DISCOVERY_FILTERS.map(({ key, labelKey, Icon }) => (
          <button key={key} onClick={() => setActiveFilter(key)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0"
            style={activeFilter === key
              ? { backgroundColor: '#92400e', color: '#fff' }
              : { backgroundColor: 'var(--color-surface)', color: 'var(--color-muted)' }}>
            <Icon className="w-3.5 h-3.5" />
            {t(labelKey)}
          </button>
        ))}
      </div>

      {/* Recipe grid */}
      {showLoader ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <LoadingPan />
        </div>
      ) : filteredRecipes.length === 0 ? (
        <div className="rounded-3xl p-12 text-center border"
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <UtensilsCrossed className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--color-border)' }} />
          <h3 className="font-serif text-lg font-bold" style={{ color: 'var(--color-text)' }}>{activeFilter === 'following' ? t('home.followingEmpty') : t('home.noRecipes')}</h3>
          <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>{activeFilter === 'following' ? t(user ? 'home.followingEmptyHint' : 'home.followingSignInHint') : t('home.switchFilters')}</p>
          {activeFilter === 'following' ? (
            <Link to={user ? '/search' : '/login'} className="inline-block mt-4 bg-amber-800 text-white text-xs font-semibold px-5 py-2.5 rounded-full hover:bg-amber-900 transition-colors">
              {t(user ? 'home.findCreators' : 'home.signIn')}
            </Link>
          ) : (
            <button onClick={() => setActiveFilter('all')} className="mt-4 bg-amber-800 text-white text-xs font-semibold px-5 py-2.5 rounded-full hover:bg-amber-900 transition-colors">{t('home.showAll')}</button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(activeFilter === 'all' ? gridRecipes : filteredRecipes).map((r) => (
            <RecipeCard
              key={r.slug}
              recipe={r}
              isFollowingAuthor={Boolean(r.isFollowing || (r.authorId != null && followedAuthorIds.has(r.authorId)))}
              onAuthorFollowed={(authorId) => setFollowedAuthorIds((current) => new Set(current).add(authorId))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
