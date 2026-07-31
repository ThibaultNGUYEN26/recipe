import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Bookmark, Star, Clock, ChefHat, Share2, UserPlus } from 'lucide-react';
import type { RecipeListItem } from '../../types';
import { useUI } from '../../contexts/UIContext';
import { useAuth } from '../../contexts/AuthContext';

const API = import.meta.env.VITE_API_URL;

interface Props { recipe: RecipeListItem }

function imgSrc(url: string | null | undefined) {
  if (!url) return null;
  return url.startsWith('/') ? `${API}${url}` : url;
}

export default function RecipeCard({ recipe }: Props) {
  const { openSaveModal, openShare, showToast } = useUI();
  const { user } = useAuth();
  const info = recipe.info as Record<string, string> | null | undefined;

  function handleSave(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    if (!user) { showToast('Sign in to save recipes', undefined, 'info'); return; }
    openSaveModal(recipe.slug);
  }
  function handleShare(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    openShare(recipe.slug);
  }

  return (
    <article className="rounded-3xl overflow-hidden border border-stone-200/80 shadow-sm hover:shadow-md transition-all duration-200 group"
      style={{ backgroundColor: 'var(--color-surface)' }}>

      {/* Creator header */}
      <div className="flex items-center justify-between p-3.5 sm:p-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-amber-800 text-white flex items-center justify-center text-sm font-bold shrink-0 ring-2 ring-stone-100 overflow-hidden">
            {recipe.authorAvatar
              ? <img src={imgSrc(recipe.authorAvatar)!} alt="" className="w-full h-full object-cover" />
              : (recipe.authorName?.[0]?.toUpperCase() ?? '?')}
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-stone-900 truncate">{recipe.authorName ?? 'Savor Chef'}</h4>
          </div>
        </div>
        {recipe.authorId && (
          <Link to={`/profile/${recipe.authorId}`} onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-800 text-white hover:bg-amber-900 transition-all shadow-sm">
            <UserPlus className="w-3.5 h-3.5" />
            <span>Follow</span>
          </Link>
        )}
      </div>

      {/* Square image */}
      <Link to={`/recipe/${recipe.slug}`}
        className="relative aspect-square block overflow-hidden bg-stone-100 cursor-pointer">
        {recipe.image ? (
          <img src={imgSrc(recipe.image)!} alt={recipe.title ?? ''}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl bg-stone-100">🍽️</div>
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
        <Link to={`/recipe/${recipe.slug}`}>
          <h3 className="font-serif text-lg sm:text-xl font-bold text-stone-900 group-hover:text-amber-800 transition-colors leading-snug">
            {recipe.title}
          </h3>
          {recipe.description && (
            <p className="text-xs text-stone-600 line-clamp-2 mt-1.5 leading-relaxed font-normal">
              {recipe.description}
            </p>
          )}
        </Link>

        {/* Time & difficulty */}
        <div className="flex items-center gap-4 text-xs font-semibold text-stone-500 mt-3 pt-3 border-t border-stone-100">
          {info?.totalTime && (
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-700" />
              <span>{info.totalTime}</span>
            </div>
          )}
          {info?.difficulty && (
            <div className="flex items-center gap-1">
              <ChefHat className="w-3.5 h-3.5 text-amber-700" />
              <span>{info.difficulty}</span>
            </div>
          )}
        </div>

        {/* Actions row */}
        <div className="flex items-center justify-between pt-4 mt-3 border-t border-stone-100">
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:text-stone-900 transition-colors">
              <Heart className="w-5 h-5 stroke-[1.8]" />
              <span>{recipe.ratingCount ?? 0}</span>
            </button>
            <Link to={`/recipe/${recipe.slug}`}
              className="flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:text-stone-900 transition-colors">
              <MessageCircle className="w-5 h-5 stroke-[1.8]" />
            </Link>
            <button onClick={handleShare} className="text-stone-500 hover:text-stone-900 transition-colors">
              <Share2 className="w-4 h-4" />
            </button>
          </div>
          <button onClick={handleSave}
            className="p-2 rounded-full text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-all">
            <Bookmark className="w-5 h-5 stroke-[1.8]" />
          </button>
        </div>
      </div>
    </article>
  );
}
