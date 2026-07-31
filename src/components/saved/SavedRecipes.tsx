import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useUI } from '../../contexts/UIContext';
import type { RecipeListItem } from '../../types';
import { Bookmark, Lock, Plus, Folder, Star, Clock, ChefHat, Trash2 } from 'lucide-react';

const API = import.meta.env.VITE_API_URL;

function imgSrc(url: string | null | undefined) {
  if (!url) return null;
  return url.startsWith('/') ? `${API}${url}` : url;
}

export default function SavedRecipes() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { showToast } = useUI();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'mine' | 'saved'>('mine');
  const [myRecipes, setMyRecipes] = useState<RecipeListItem[]>([]);
  const [savedRecipes, setSavedRecipes] = useState<RecipeListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      fetch(`${API}/api/users/me/recipes?lang=${language}`, { credentials: 'include' }).then((r) => r.json()),
      fetch(`${API}/api/users/me/saved?lang=${language}`, { credentials: 'include' }).then((r) => r.json()),
    ])
      .then(([mine, saved]) => {
        setMyRecipes(Array.isArray(mine) ? mine : []);
        setSavedRecipes(Array.isArray(saved) ? saved : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user, language]);

  async function deleteRecipe(slug: string) {
    const res = await fetch(`${API}/api/recipes/${slug}`, { method: 'DELETE', credentials: 'include' });
    if (res.ok) { setMyRecipes((p) => p.filter((r) => r.slug !== slug)); showToast('Recipe deleted'); }
  }

  async function unsaveRecipe(slug: string) {
    const res = await fetch(`${API}/api/recipes/${slug}/save`, { method: 'DELETE', credentials: 'include' });
    if (res.ok) { setSavedRecipes((p) => p.filter((r) => r.slug !== slug)); showToast('Removed from saved'); }
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6">
        <Bookmark className="w-12 h-12" style={{ color: 'var(--color-border)' }} />
        <p className="text-center text-sm" style={{ color: 'var(--color-muted)' }}>Sign in to see your recipes and saved collection</p>
        <Link to="/login" className="px-6 py-3 rounded-2xl bg-stone-900 text-white text-sm font-medium">Sign in</Link>
      </div>
    );
  }

  const current = activeTab === 'mine' ? myRecipes : savedRecipes;

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 space-y-6 pb-24">

      {/* Header */}
      <div className="flex items-center justify-between p-5 rounded-3xl border border-stone-200/80 shadow-sm"
        style={{ backgroundColor: 'var(--color-surface)' }}>
        <div>
          <h1 className="font-serif text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <Bookmark className="w-6 h-6 text-amber-800" />
            Saved Collections
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>Your organized culinary cookbook</p>
        </div>
        <Link to="/add-recipe"
          className="flex items-center gap-1.5 bg-stone-900 text-white text-xs font-bold px-3.5 py-2 rounded-2xl hover:bg-amber-800 transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> New Recipe
        </Link>
      </div>

      {/* Collection tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button onClick={() => setActiveTab('mine')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0"
          style={activeTab === 'mine'
            ? { backgroundColor: '#92400e', color: '#fff' }
            : { backgroundColor: 'var(--color-surface)', color: '#44403c', border: '1px solid var(--color-border)' }}>
          <ChefHat className="w-4 h-4" />
          My Recipes ({myRecipes.length})
        </button>
        <button onClick={() => setActiveTab('saved')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0"
          style={activeTab === 'saved'
            ? { backgroundColor: '#92400e', color: '#fff' }
            : { backgroundColor: 'var(--color-surface)', color: '#44403c', border: '1px solid var(--color-border)' }}>
          <Bookmark className="w-4 h-4" />
          Saved ({savedRecipes.length})
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-3xl h-64 animate-pulse" style={{ backgroundColor: 'var(--color-border)' }} />
          ))}
        </div>
      ) : current.length === 0 ? (
        <div className="rounded-3xl p-12 text-center border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <Bookmark className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--color-border)' }} />
          <h3 className="font-serif text-lg font-bold" style={{ color: 'var(--color-text)' }}>
            {activeTab === 'mine' ? 'No recipes yet' : 'No saved recipes yet'}
          </h3>
          <p className="text-xs mt-1 max-w-xs mx-auto" style={{ color: 'var(--color-muted)' }}>
            {activeTab === 'mine'
              ? 'Share your first recipe with the community.'
              : 'Browse the feed and tap the bookmark icon to save recipes.'}
          </p>
          {activeTab === 'mine' && (
            <Link to="/add-recipe" className="mt-4 inline-block text-xs font-semibold text-amber-800 underline">
              Add your first recipe
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {current.map((recipe) => {
            const info = recipe.info as Record<string, string> | null | undefined;
            return (
              <div key={recipe.slug}
                className="rounded-3xl overflow-hidden border border-stone-200/80 shadow-sm hover:shadow-md transition-all duration-200 group flex flex-col"
                style={{ backgroundColor: 'var(--color-surface)' }}>

                {/* Image */}
                <Link to={`/recipe/${recipe.slug}`} className="relative aspect-[16/10] block overflow-hidden bg-stone-100">
                  {recipe.image ? (
                    <img src={imgSrc(recipe.image)!} alt={recipe.title ?? ''}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl bg-stone-100">🍽️</div>
                  )}
                  <div className="absolute top-3 left-3 bg-stone-900/80 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase">
                    {recipe.category.label}
                  </div>
                  {recipe.avgRating != null && (
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md text-stone-900 px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      {recipe.avgRating.toFixed(1)}
                    </div>
                  )}
                </Link>

                {/* Body */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <Link to={`/recipe/${recipe.slug}`}>
                      <h3 className="font-serif text-base font-bold group-hover:text-amber-800 transition-colors line-clamp-1" style={{ color: 'var(--color-text)' }}>
                        {recipe.title}
                      </h3>
                    </Link>
                    {recipe.authorName && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>by {recipe.authorName}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs font-semibold mt-3 pt-3 border-t border-stone-100">
                    {info?.totalTime ? (
                      <span className="flex items-center gap-1" style={{ color: 'var(--color-muted)' }}>
                        <Clock className="w-3.5 h-3.5 text-amber-700" />
                        {info.totalTime}
                      </span>
                    ) : <span />}
                    <button
                      onClick={() => activeTab === 'mine' ? deleteRecipe(recipe.slug) : unsaveRecipe(recipe.slug)}
                      className="flex items-center gap-1 text-[11px] font-semibold text-rose-500 hover:text-rose-700 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                      {activeTab === 'mine' ? 'Delete' : 'Remove'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
