import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Bookmark, BookmarkCheck, Star, Clock, ChefHat, Share2, UserPlus, UserMinus, Sparkles } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import type { RecipeListItem } from '../../types';

function recipeUrl(slug: string, authorUsername?: string | null) {
  return authorUsername ? `/${authorUsername}/${slug}` : `/recipe/${slug}`;
}
import { useUI } from '../../contexts/UIContext';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../lib/apiFetch';
import { useLanguage } from '../../contexts/LanguageContext';
import VerifiedBadge from '../profile/VerifiedBadge';

const API = import.meta.env.VITE_API_URL;

interface Props { recipe: RecipeListItem; hideAuthor?: boolean }

function imgSrc(url: string | null | undefined) {
  if (!url) return null;
  return url.startsWith('/') ? `${API}${url}` : url;
}

export default function RecipeCard({ recipe, hideAuthor = false }: Props) {
  const { openSaveModal, openShare, showToast } = useUI();
  const { user } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const info = recipe.info as Record<string, string> | null | undefined;

  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(recipe.likeCount ?? 0);

  async function handleFollow(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    if (!user) { navigate('/login'); return; }
    setFollowLoading(true);
    try {
      const method = isFollowing ? 'DELETE' : 'POST';
      const res = await apiFetch(`/api/users/${recipe.authorId}/follow`, { method });
      if (res.ok) {
        setIsFollowing(!isFollowing);
        showToast(isFollowing ? 'Unfollowed' : 'Following!');
      }
    } finally {
      setFollowLoading(false);
    }
  }

  async function handleLike(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    if (!user) { showToast('Sign in to like recipes', undefined, 'info'); return; }
    const method = isLiked ? 'DELETE' : 'POST';
    const res = await apiFetch(`/api/recipes/${recipe.slug}/like`, { method });
    if (res.ok) {
      const data = await res.json();
      setIsLiked(!isLiked);
      setLikeCount(data.likeCount);
    }
  }

  const [isSaved, setIsSaved] = useState(() => {
    // Check saved cache for initial state
    const saved = queryClient.getQueriesData<RecipeListItem[]>({ queryKey: ['saved'] });
    return saved.some(([, data]) => Array.isArray(data) && data.some((r) => r.slug === recipe.slug));
  });

  // Listen for save event from the modal
  useEffect(() => {
    function handleSaved(e: Event) {
      const { slug } = (e as CustomEvent<{ slug: string }>).detail;
      if (slug === recipe.slug) setIsSaved(true);
    }
    window.addEventListener('recipe-saved', handleSaved);
    return () => window.removeEventListener('recipe-saved', handleSaved);
  }, [recipe.slug]);

  async function handleSave(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    if (!user) { showToast('Sign in to save recipes', undefined, 'info'); return; }
    if (isSaved) {
      setIsSaved(false);
      await apiFetch(`/api/recipes/${recipe.slug}/save`, { method: 'DELETE' });
      queryClient.invalidateQueries({ queryKey: ['saved'] });
      showToast('Removed from saved', undefined, 'success', 6000);
    } else {
      openSaveModal(recipe.slug);
    }
  }

  function handleShare(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    openShare({
      type: 'recipe',
      path: recipeUrl(recipe.slug, recipe.authorUsername),
      title: recipe.title,
      text: recipe.description,
    });
  }

  return (
    <article className="recipe-card rounded-3xl overflow-hidden border shadow-sm hover:shadow-md transition-all duration-200 group">

      {/* Creator header */}
      {!hideAuthor && (
      <div className="flex items-center justify-between p-3.5 sm:p-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-amber-800 text-white flex items-center justify-center text-sm font-bold shrink-0 ring-2 ring-amber-700 avatar-ring overflow-hidden">
            {recipe.authorAvatar
              ? <img src={imgSrc(recipe.authorAvatar)!} alt="" className="w-full h-full object-cover" />
              : (recipe.authorName?.[0]?.toUpperCase() ?? '?')}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1 min-w-0">
              <h4 className="recipe-card__primary text-xs font-bold truncate">{recipe.authorName ?? 'Savor Chef'}</h4>
              {recipe.authorIsVerified && <VerifiedBadge className="w-3.5 h-3.5" />}
            </div>
          </div>
        </div>
        {recipe.authorId && recipe.authorId !== user?.id && (
          <button onClick={handleFollow} disabled={followLoading}
            className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-800 text-white hover:bg-amber-900 transition-all shadow-sm disabled:opacity-60">
            {isFollowing ? <UserMinus className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
            <span>{isFollowing ? 'Following' : 'Follow'}</span>
          </button>
        )}
      </div>
      )}

      {/* Square image */}
      <Link to={recipeUrl(recipe.slug, recipe.authorUsername)}
        className="recipe-card__image-placeholder relative aspect-square block overflow-hidden cursor-pointer">
        {recipe.image ? (
          <img src={imgSrc(recipe.image)!} alt={recipe.title ?? ''}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out" />
        ) : (
          <div className="recipe-card__image-placeholder w-full h-full flex items-center justify-center text-4xl">🍽️</div>
        )}

        {/* Floating badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 max-w-[80%]">
          <span className="bg-stone-900/80 backdrop-blur-md text-stone-50 text-[10px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider">
            {recipe.category.label}
          </span>
          {(recipe.tags as string[] | undefined)?.slice(0, 1).map((tag) => (
            <span key={tag} className="bg-amber-900/80 backdrop-blur-md text-amber-100 text-[10px] font-semibold px-2.5 py-1 rounded-full">
              {tag}
            </span>
          ))}
        </div>

        {/* Rating badge */}
        {recipe.avgRating != null && (
          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md text-stone-900 px-2.5 py-1 rounded-full text-xs font-bold shadow-md flex items-center gap-1">
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>{recipe.avgRating.toFixed(1)}</span>
          </div>
        )}
      </Link>

      {/* Content + actions */}
      <div className="p-4 sm:p-5">
        {recipe.recommendationReason && (
          <p className="recipe-card__accent flex items-center gap-1 text-[10px] font-bold mb-1.5">
            <Sparkles className="w-3 h-3" /> {t(`home.reason.${recipe.recommendationReason}`, recipe.recommendationReasonValue ? { value: recipe.recommendationReasonValue } : {})}
          </p>
        )}
        <Link to={recipeUrl(recipe.slug, recipe.authorUsername)}>
          <h3 className="recipe-card__primary recipe-card__title font-serif text-lg sm:text-xl font-bold transition-colors leading-snug">
            {recipe.title}
          </h3>
          {recipe.description && (
            <p className="recipe-card__muted text-xs line-clamp-2 mt-1.5 leading-relaxed font-normal">
              {recipe.description}
            </p>
          )}
        </Link>

        {/* Time & difficulty */}
        {(info?.totalTime || info?.difficulty) && (
        <div className="recipe-card__muted recipe-card__divider flex items-center gap-4 text-xs font-semibold mt-3 pt-3 border-t">
          {info?.totalTime && (
            <div className="flex items-center gap-1">
              <Clock className="recipe-card__accent w-3.5 h-3.5" />
              <span>{info.totalTime}</span>
            </div>
          )}
          {info?.difficulty && (
            <div className="flex items-center gap-1">
              <ChefHat className="recipe-card__accent w-3.5 h-3.5" />
              <span>{info.difficulty}</span>
            </div>
          )}
        </div>
        )}

        {/* Actions row */}
        <div className="recipe-card__divider grid grid-cols-4 items-center pt-3 mt-3 border-t">
          <button onClick={handleLike} className="recipe-card__action flex min-h-11 min-w-0 items-center justify-center gap-1 text-xs font-bold transition-colors">
            <Heart className={`h-5 w-5 shrink-0 stroke-[1.8] transition-colors ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
            <span>{likeCount}</span>
          </button>
          <Link to={`${recipeUrl(recipe.slug, recipe.authorUsername)}#comments`}
            aria-label={`View ${recipe.commentCount ?? 0} comments for ${recipe.title}`}
            className="recipe-card__action flex min-h-11 min-w-0 items-center justify-center gap-1 text-xs font-bold transition-colors">
            <MessageCircle className="h-5 w-5 shrink-0 stroke-[1.8]" />
            <span>{recipe.commentCount ?? 0}</span>
          </Link>
          <button onClick={handleShare} aria-label={`Share ${recipe.title}`}
            className="recipe-card__action flex min-h-11 min-w-0 items-center justify-center transition-colors">
            <Share2 className="h-4 w-4 shrink-0" />
          </button>
          <button onClick={handleSave} aria-label={isSaved ? `Remove ${recipe.title} from saved recipes` : `Save ${recipe.title}`}
            className="recipe-card__action recipe-card__save flex min-h-11 min-w-0 items-center justify-center rounded-full transition-all">
            {isSaved
              ? <BookmarkCheck className="h-5 w-5 shrink-0 fill-amber-800 text-amber-800" />
              : <Bookmark className="h-5 w-5 shrink-0 stroke-[1.8]" />}
          </button>
        </div>
      </div>
    </article>
  );
}
