import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useUI } from '../../contexts/UIContext';
import type { RecipeListItem, SavedCategory } from '../../types';
import { Bookmark, Plus, Folder, Star, Clock, ChefHat, Trash2 } from 'lucide-react';
import { apiFetch } from '../../lib/apiFetch';

const API = import.meta.env.VITE_API_URL;

function imgSrc(url: string | null | undefined) {
  if (!url) return null;
  return url.startsWith('/') ? `${API}${url}` : url;
}


export default function SavedRecipes() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { showToast } = useUI();
  const [activeTab, setActiveTab] = useState<'mine' | 'saved'>('mine');
  const [myRecipes, setMyRecipes] = useState<RecipeListItem[]>([]);
  const [savedRecipes, setSavedRecipes] = useState<RecipeListItem[]>([]);
  const [savedCategories, setSavedCategories] = useState<SavedCategory[]>([]);
  const [activeSavedCategory, setActiveSavedCategory] = useState<'all' | 'favorites' | number>('all');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      apiFetch(`/api/users/me/recipes?lang=${language}`).then((r) => r.json()),
      apiFetch(`/api/users/me/saved?lang=${language}`).then((r) => r.json()),
      apiFetch('/api/users/me/saved-categories').then((r) => r.json()),
    ])
      .then(([mine, saved, categories]) => {
        setMyRecipes(Array.isArray(mine) ? mine : []);
        setSavedRecipes(Array.isArray(saved) ? saved : []);
        setSavedCategories(Array.isArray(categories) ? categories : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user, language]);

  async function deleteRecipe(slug: string) {
    const res = await apiFetch(`/api/recipes/${slug}`, { method: 'DELETE' });
    if (res.ok) { setMyRecipes((p) => p.filter((r) => r.slug !== slug)); showToast('Recipe deleted'); }
  }

  async function unsaveRecipe(slug: string) {
    const res = await apiFetch(`/api/recipes/${slug}/save`, { method: 'DELETE' });
    if (res.ok) { setSavedRecipes((p) => p.filter((r) => r.slug !== slug)); showToast('Removed from saved'); }
  }

  async function createSavedCategory() {
    const name = newCategoryName.trim();
    if (!name) return;
    setCreatingCategory(true);
    try {
      const res = await apiFetch('/api/users/me/saved-categories', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error ?? 'Failed to create category', undefined, 'error'); return; }
      setSavedCategories((previous) => [...previous, data].sort((a, b) => a.name.localeCompare(b.name)));
      setActiveSavedCategory(data.id);
      setNewCategoryName('');
      showToast('Category created');
    } catch {
      showToast('Failed to create category', undefined, 'error');
    } finally {
      setCreatingCategory(false);
    }
  }

  async function moveSavedRecipe(slug: string, savedCategoryId: number | null) {
    const res = await apiFetch(`/api/recipes/${slug}/save`, {
      method: 'PATCH',
      body: JSON.stringify({ savedCategoryId }),
    });
    if (!res.ok) { showToast('Failed to move recipe', undefined, 'error'); return; }
    const category = savedCategories.find((item) => item.id === savedCategoryId) ?? null;
    setSavedRecipes((previous) => previous.map((recipe) => recipe.slug === slug
      ? { ...recipe, savedCategory: category }
      : recipe));
    showToast(category ? `Moved to ${category.name}` : 'Moved to Favorites');
  }

  if (!user) {
    return (
      <div className="saved-page flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6">
        <Bookmark className="w-12 h-12" style={{ color: 'var(--color-border)' }} />
        <p className="text-center text-sm" style={{ color: 'var(--color-muted)' }}>Sign in to see your recipes and saved collection</p>
        <Link to="/login" className="saved-primary px-6 py-3 rounded-2xl text-sm font-medium transition-colors">Sign in</Link>
      </div>
    );
  }

  const visibleSavedRecipes = savedRecipes.filter((recipe) => {
    if (activeSavedCategory === 'all') return true;
    if (activeSavedCategory === 'favorites') return !recipe.savedCategory;
    return recipe.savedCategory?.id === activeSavedCategory;
  });
  const current = activeTab === 'mine' ? myRecipes : visibleSavedRecipes;

  return (
    <div className="saved-page max-w-6xl mx-auto px-4 py-4 space-y-6 pb-24">

      {/* Header */}
      <div className="saved-card flex items-center justify-between p-5 rounded-3xl border shadow-sm"
        style={{ backgroundColor: 'var(--color-surface)' }}>
        <div>
          <h1 className="font-serif text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <Bookmark className="saved-accent w-6 h-6" />
            Saved Collections
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>Your organized culinary cookbook</p>
        </div>
        <Link to="/add-recipe"
          className="saved-primary flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-2xl transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> New Recipe
        </Link>
      </div>

      {/* Collection tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button onClick={() => setActiveTab('mine')}
          className={`saved-tab flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-xs font-bold transition-all shrink-0 ${activeTab === 'mine' ? 'saved-tab--active' : ''}`}>
          <ChefHat className="w-4 h-4" />
          My Recipes ({myRecipes.length})
        </button>
        <button onClick={() => setActiveTab('saved')}
          className={`saved-tab flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-xs font-bold transition-all shrink-0 ${activeTab === 'saved' ? 'saved-tab--active' : ''}`}>
          <Bookmark className="w-4 h-4" />
          Saved ({savedRecipes.length})
        </button>
      </div>

      {activeTab === 'saved' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button onClick={() => setActiveSavedCategory('all')}
              className={`saved-tab shrink-0 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${activeSavedCategory === 'all' ? 'saved-tab--active' : ''}`}>
              All ({savedRecipes.length})
            </button>
            <button onClick={() => setActiveSavedCategory('favorites')}
              className={`saved-tab shrink-0 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${activeSavedCategory === 'favorites' ? 'saved-tab--active' : ''}`}>
              Favorites ({savedRecipes.filter((recipe) => !recipe.savedCategory).length})
            </button>
            {savedCategories.map((category) => (
              <button key={category.id} onClick={() => setActiveSavedCategory(category.id)}
                className={`saved-tab shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${activeSavedCategory === category.id ? 'saved-tab--active' : ''}`}>
                <Folder className="w-3.5 h-3.5" />
                {category.name} ({savedRecipes.filter((recipe) => recipe.savedCategory?.id === category.id).length})
              </button>
            ))}
          </div>
          <div className="flex gap-2 max-w-sm">
            <input value={newCategoryName} onChange={(event) => setNewCategoryName(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && createSavedCategory()}
              maxLength={40} placeholder="Create a saved category"
              className="saved-input min-w-0 flex-1 px-3 py-2 rounded-xl text-xs outline-none"
              style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
            <button onClick={createSavedCategory} disabled={creatingCategory || !newCategoryName.trim()}
              className="saved-primary flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50">
              <Plus className="w-3.5 h-3.5" /> {creatingCategory ? 'Creating…' : 'Create'}
            </button>
          </div>
        </div>
      )}

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
            <Link to="/add-recipe" className="saved-accent mt-4 inline-block text-xs font-semibold underline">
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
                className="saved-card rounded-3xl overflow-hidden border shadow-sm hover:shadow-md transition-all duration-200 group flex flex-col">

                {/* Image */}
                <Link to={`/recipe/${recipe.slug}`} className="recipe-card__image-placeholder relative aspect-[16/10] block overflow-hidden">
                  {recipe.image ? (
                    <img src={imgSrc(recipe.image)!} alt={recipe.title ?? ''}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="recipe-card__image-placeholder w-full h-full flex items-center justify-center text-3xl">🍽️</div>
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
                      <h3 className="saved-card__title font-serif text-base font-bold transition-colors line-clamp-1">
                        {recipe.title}
                      </h3>
                    </Link>
                    {recipe.authorName && (
                      <p className="saved-card__muted text-xs mt-0.5">by {recipe.authorName}</p>
                    )}
                  </div>

                  <div className="saved-card__divider flex items-center justify-between text-xs font-semibold mt-3 pt-3 border-t">
                    {info?.totalTime ? (
                      <span className="saved-card__muted flex items-center gap-1">
                        <Clock className="saved-card__accent w-3.5 h-3.5" />
                        {info.totalTime}
                      </span>
                    ) : <span />}
                    <button
                      onClick={() => activeTab === 'mine' ? deleteRecipe(recipe.slug) : unsaveRecipe(recipe.slug)}
                      className="saved-danger flex items-center gap-1 text-[11px] font-semibold transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                      {activeTab === 'mine' ? 'Delete' : 'Remove'}
                    </button>
                  </div>
                  {activeTab === 'saved' && (
                    <label className="saved-card__muted flex items-center gap-2 mt-3 text-[11px]">
                      <Folder className="saved-card__accent w-3.5 h-3.5 shrink-0" />
                      <select
                        value={recipe.savedCategory?.id ?? ''}
                        onChange={(event) => moveSavedRecipe(recipe.slug, event.target.value ? Number(event.target.value) : null)}
                        className="min-w-0 flex-1 rounded-xl px-2 py-1.5 text-xs outline-none"
                        style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                        aria-label={`Category for ${recipe.title}`}
                      >
                        <option value="">Favorites</option>
                        {savedCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                      </select>
                    </label>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
