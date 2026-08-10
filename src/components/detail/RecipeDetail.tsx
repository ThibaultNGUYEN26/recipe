import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/UIContext';
import type { RecipeDetail as RecipeDetailType, Comment, IngredientSection, InstructionStep } from '../../types';
import { ArrowLeft, Star, Bookmark, BookmarkCheck, Share2, Clock, Users, ChefHat, Timer, Check, Heart, Send, Flag, Trash2, Languages, ExternalLink } from 'lucide-react';
import VerifiedBadge from '../profile/VerifiedBadge';
import { apiFetch } from '../../lib/apiFetch';

const API = import.meta.env.VITE_API_URL;

function imgSrc(url: string | null) {
  if (!url) return null;
  return url.startsWith('/') ? `${API}${url}` : url;
}

function languageName(language: string | undefined) {
  return language === 'fr' ? 'French' : language === 'en' ? 'English' : language === 'es' ? 'Spanish' : language?.toUpperCase() || 'original';
}

function StarRow({ value, onChange, readonly }: { value: number; onChange?: (v: number) => void; readonly?: boolean }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          disabled={readonly}
          onMouseEnter={() => !readonly && setHover(n)}
          onMouseLeave={() => !readonly && setHover(0)}
          onClick={() => onChange?.(n)}
          className="p-0.5"
        >
          <Star
            size={20}
            className={(hover || value) >= n ? 'text-amber-500 fill-amber-500' : 'text-stone-300'}
          />
        </button>
      ))}
    </div>
  );
}

function CommentItem({ comment, recipeSlug, onDelete, onLike }: {
  comment: Comment;
  recipeSlug: string;
  onDelete: (id: number) => void;
  onLike: (id: number, isLiked: boolean, likesCount: number) => void;
}) {
  const { user } = useAuth();
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submitReply() {
    if (!replyText.trim()) return;
    setSubmitting(true);
    try {
      const res = await apiFetch(`/api/recipes/${recipeSlug}/comments`, {
        method: 'POST',
        body: JSON.stringify({ text: replyText.trim(), parentId: comment.id }),
      });
      if (res.ok) {
        setReplyText('');
        setReplying(false);
        window.location.reload();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleLike() {
    if (!user) return;
    const res = await apiFetch(`/api/recipes/${recipeSlug}/comments/${comment.id}/like`, {
      method: 'POST',
    });
    if (res.ok) {
      const d = await res.json();
      onLike(comment.id, d.isLiked, d.likesCount);
    }
  }

  return (
    <div>
      <div className="flex gap-3">
        <div className="w-8 h-8 rounded-full bg-amber-800 text-white flex items-center justify-center text-xs font-bold shrink-0">
          {comment.author.name?.[0]?.toUpperCase() ?? '?'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{comment.author.name ?? 'Anonymous'}</span>
            {comment.author.isVerified && <VerifiedBadge className="w-3.5 h-3.5" />}
            <span className="text-xs" style={{ color: 'var(--color-muted)' }}>{new Date(comment.createdAt).toLocaleDateString()}</span>
          </div>
          <p className="text-sm mt-0.5 leading-relaxed" style={{ color: 'var(--color-text)' }}>{comment.text}</p>
          <div className="flex items-center gap-3 mt-1.5">
            <button onClick={toggleLike} className="flex items-center gap-1 text-xs" style={{ color: comment.isLiked ? '#e11d48' : 'var(--color-muted)' }}>
              <Heart size={13} className={comment.isLiked ? 'fill-rose-600' : ''} />
              {comment.likesCount > 0 && comment.likesCount}
            </button>
            {user && !comment.parentId && (
              <button onClick={() => setReplying(!replying)} className="text-xs" style={{ color: 'var(--color-muted)' }}>Reply</button>
            )}
            {user?.id === comment.author.id && (
              <button onClick={() => onDelete(comment.id)} className="text-xs" style={{ color: 'var(--color-muted)' }}>
                <Trash2 size={13} />
              </button>
            )}
          </div>
          {replying && (
            <div className="flex gap-2 mt-2">
              <input
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write a reply…"
                className="flex-1 text-sm px-3 py-1.5 rounded-xl outline-none"
                style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                onKeyDown={(e) => e.key === 'Enter' && submitReply()}
              />
              <button onClick={submitReply} disabled={submitting} className="text-amber-800"><Send size={16} /></button>
            </div>
          )}
        </div>
      </div>
      {comment.replies.length > 0 && (
        <div className="ml-11 mt-3 space-y-3 pl-3" style={{ borderLeft: '2px solid var(--color-border)' }}>
          {comment.replies.map((r) => (
            <CommentItem key={r.id} comment={r} recipeSlug={recipeSlug} onDelete={onDelete} onLike={onLike} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function RecipeDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { language } = useLanguage();
  const { user } = useAuth();
  const { openShare, openSaveModal, openReport, startTimer, showToast } = useUI();
  const navigate = useNavigate();

  const [recipe, setRecipe] = useState<RecipeDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [servings, setServings] = useState(1);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(new Set());
  const [userScore, setUserScore] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [contentLanguage, setContentLanguage] = useState<string | null>(null);

  useEffect(() => {
    setContentLanguage(null);
  }, [slug, language]);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    Promise.all([
      apiFetch(`/api/recipes/${slug}?lang=${contentLanguage ?? language}`).then((r) => r.json()),
      apiFetch(`/api/recipes/${slug}/comments`).then((r) => r.json()),
    ])
      .then(([rd, cm]) => {
        setRecipe(rd);
        setServings((rd.info as Record<string, unknown> | null | undefined)?.servings as number ?? 4);
        setUserScore(rd.myRating ?? 0);
        setComments(Array.isArray(cm) ? cm : []);
        if (!rd.error) {
          const storageKey = 'savor-analytics-visitor';
          let visitorId = localStorage.getItem(storageKey);
          if (!visitorId) {
            visitorId = crypto.randomUUID();
            localStorage.setItem(storageKey, visitorId);
          }
          apiFetch(`/api/recipes/${slug}/view`, {
            method: 'POST',
            body: JSON.stringify({ visitorId }),
          }).catch(() => {});
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug, language, contentLanguage]);

  useEffect(() => {
    function handleRecipeSaved(event: Event) {
      const detail = (event as CustomEvent<{ slug: string; savedCategoryId: number | null }>).detail;
      if (detail.slug === slug) {
        setRecipe((current) => current ? { ...current, isSaved: true, savedCategoryId: detail.savedCategoryId } : current);
      }
    }
    window.addEventListener('recipe-saved', handleRecipeSaved);
    return () => window.removeEventListener('recipe-saved', handleRecipeSaved);
  }, [slug]);

  useEffect(() => {
    if (!recipe?.title) return;
    const previousTitle = document.title;
    document.title = `${recipe.title} — Savor`;
    return () => { document.title = previousTitle; };
  }, [recipe?.title]);

  async function rate(score: number) {
    if (!user) { showToast('Sign in to rate', undefined, 'info'); return; }
    setUserScore(score);
    const res = await apiFetch(`/api/recipes/${slug}/rate`, {
      method: 'POST',
      body: JSON.stringify({ score }),
    });
    if (res.ok) {
      const d = await res.json();
      setRecipe((r) => r ? { ...r, avgRating: d.avgRating, ratingCount: d.ratingCount, myRating: d.myRating } : r);
      showToast('Rating saved!');
    }
  }

  async function toggleSave() {
    if (!user) { showToast('Sign in to save', undefined, 'info'); return; }
    if (!recipe) return;
    if (recipe.isSaved) {
      await apiFetch(`/api/recipes/${slug}/save`, { method: 'DELETE' });
      setRecipe((r) => r ? { ...r, isSaved: false, savedCategoryId: null } : r);
      showToast('Removed from saved');
    } else {
      openSaveModal(slug!);
    }
  }

  async function postComment() {
    if (!commentText.trim() || !user) return;
    setSubmittingComment(true);
    try {
      const res = await apiFetch(`/api/recipes/${slug}/comments`, {
        method: 'POST',
        body: JSON.stringify({ text: commentText.trim() }),
      });
      if (res.ok) {
        const c: Comment = await res.json();
        setComments((prev) => [c, ...prev]);
        setCommentText('');
      }
    } finally {
      setSubmittingComment(false);
    }
  }

  function deleteComment(id: number) {
    apiFetch(`/api/recipes/${slug}/comments/${id}`, { method: 'DELETE' })
      .then(() => setComments((prev) => prev.filter((c) => c.id !== id)));
  }

  function handleLike(id: number, isLiked: boolean, likesCount: number) {
    setComments((prev) => prev.map((c) =>
      c.id === id ? { ...c, isLiked, likesCount } : { ...c, replies: c.replies.map((r) => r.id === id ? { ...r, isLiked, likesCount } : r) }
    ));
  }

  function toggleIngredient(key: string) {
    setCheckedIngredients((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function scaleAmount(text: string): string {
    const info = recipe?.info as Record<string, unknown> | null | undefined;
    const baseServings = (info?.servings as number) ?? 4;
    if (baseServings === 0) return text;
    return text.replace(/(\d+(?:[.,]\d+)?)/g, (_, n) => {
      const scaled = (parseFloat(n.replace(',', '.')) / baseServings) * servings;
      return Number.isInteger(scaled) ? String(scaled) : scaled.toFixed(1);
    });
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 rounded-full border-2 border-amber-800 border-t-transparent animate-spin" />
    </div>
  );

  if (!recipe) return (
    <div className="text-center py-20">
      <p className="text-4xl mb-3">🍽️</p>
      <p style={{ color: 'var(--color-muted)' }}>Recipe not found</p>
      <button onClick={() => navigate('/')} className="mt-4 text-sm text-amber-800 underline">Go home</button>
    </div>
  );

  const info = recipe.info as Record<string, unknown> | null | undefined;
  const baseServings = (info?.servings as number) ?? 4;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back + actions bar */}
      <div className="sticky top-14 z-30 flex items-center justify-between px-4 py-2" style={{ backgroundColor: 'var(--color-bg)' }}>
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--color-muted)' }}>
          <ArrowLeft size={18} />
          Back
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => openShare({
            type: 'recipe',
            path: `/recipe/${encodeURIComponent(recipe.slug)}`,
            title: recipe.title,
            text: recipe.description,
          })} aria-label="Share recipe" style={{ color: 'var(--color-muted)' }}><Share2 size={18} /></button>
          <button onClick={toggleSave} style={{ color: recipe.isSaved ? '#92400e' : 'var(--color-muted)' }}>
            {recipe.isSaved ? <BookmarkCheck size={20} className="fill-amber-800" /> : <Bookmark size={20} />}
          </button>
          <button onClick={() => openReport(recipe.slug, 'recipe')} style={{ color: 'var(--color-muted)' }}><Flag size={17} /></button>
        </div>
      </div>

      {/* Hero image */}
      {recipe.image && (
        <div className="mx-4 rounded-3xl overflow-hidden aspect-[4/3] mb-5">
          <img src={imgSrc(recipe.image)!} alt={recipe.title} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="px-4 space-y-6">
        {/* Title + meta */}
        <div>
          <div className="flex gap-2 flex-wrap mb-2">
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
              {recipe.category.label}
            </span>
            {(recipe.tags as string[] | undefined)?.map((t) => (
              <span key={t} className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--color-border)', color: 'var(--color-muted)' }}>{t}</span>
            ))}
          </div>
          <h1 className="font-serif text-2xl font-semibold leading-snug mb-2" style={{ color: 'var(--color-text)' }}>{recipe.title}</h1>
          {recipe.description && <p className="text-sm leading-relaxed" style={{ color: 'var(--color-muted)' }}>{recipe.description}</p>}
          {recipe.availableLanguages && recipe.availableLanguages.length > 1 && (
            <div className="flex items-center gap-2 mt-2 text-xs" style={{ color: 'var(--color-muted)' }}>
              <Languages className="w-3.5 h-3.5" />
              {recipe.isTranslated && <span>Translated from {languageName(recipe.originalLanguage)}</span>}
              {recipe.isTranslated ? (
                <button onClick={() => setContentLanguage(recipe.originalLanguage ?? null)} className="font-bold underline" style={{ color: 'var(--color-accent)' }}>
                  See original
                </button>
              ) : recipe.availableLanguages.includes(language) && language !== recipe.originalLanguage ? (
                <button onClick={() => setContentLanguage(language)} className="font-bold underline" style={{ color: 'var(--color-accent)' }}>
                  See translation
                </button>
              ) : null}
            </div>
          )}

          {/* Author */}
          {recipe.authorName && (
            <Link to={`${recipe.authorUsername ? `/u/${encodeURIComponent(recipe.authorUsername)}` : `/profile/${recipe.authorId}`}?fromRecipe=${encodeURIComponent(recipe.slug)}`} className="flex items-center gap-2 mt-3">
              <div className="w-7 h-7 rounded-full bg-amber-800 text-white flex items-center justify-center text-xs font-bold overflow-hidden">
                {recipe.authorAvatar ? <img src={imgSrc(recipe.authorAvatar)!} alt="" className="w-full h-full object-cover" /> : recipe.authorName[0].toUpperCase()}
              </div>
              <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{recipe.authorName}</span>
              {recipe.authorIsVerified && <VerifiedBadge className="w-4 h-4" />}
            </Link>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { icon: <Clock size={16} />, label: 'Total', value: info?.totalTime as string },
            { icon: <Clock size={16} />, label: 'Prep', value: info?.prepTime as string },
            { icon: <ChefHat size={16} />, label: 'Level', value: info?.difficulty as string },
            { icon: <Star size={16} />, label: 'Rating', value: recipe.avgRating ? recipe.avgRating.toFixed(1) : '—' },
          ].map(({ icon, label, value }) => value ? (
            <div key={label} className="flex flex-col items-center gap-1 py-3 rounded-2xl" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <span className="text-amber-800">{icon}</span>
              <span className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>{value}</span>
              <span className="text-[10px]" style={{ color: 'var(--color-muted)' }}>{label}</span>
            </div>
          ) : null)}
        </div>

        {/* Servings scaler */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-serif text-lg font-semibold" style={{ color: 'var(--color-text)' }}>Ingredients</h2>
            <div className="flex items-center gap-3">
              <button onClick={() => setServings(Math.max(1, servings - 1))} className="w-7 h-7 rounded-full border text-lg flex items-center justify-center" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>−</button>
              <div className="flex items-center gap-1">
                <Users size={14} style={{ color: 'var(--color-muted)' }} />
                <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--color-text)' }}>{servings}</span>
              </div>
              <button onClick={() => setServings(servings + 1)} className="w-7 h-7 rounded-full border text-lg flex items-center justify-center" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>+</button>
            </div>
          </div>

          {(recipe.ingredients as IngredientSection[]).map((section) => (
            <div key={section.section} className="mb-4">
              {section.section && section.section !== 'main' && (
                <h3 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-muted)' }}>{section.section}</h3>
              )}
              <div className="space-y-2">
                {section.items.map((item, i) => {
                  const key = `${section.section}-${i}`;
                  const checked = checkedIngredients.has(key);
                  return (
                    <button key={key} onClick={() => toggleIngredient(key)} className="w-full flex items-center gap-3 text-left">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${checked ? 'bg-amber-800 border-amber-800' : ''}`} style={checked ? {} : { borderColor: 'var(--color-border)' }}>
                        {checked && <Check size={11} className="text-white" />}
                      </div>
                      <span className={`text-sm ${checked ? 'line-through' : ''}`} style={{ color: checked ? 'var(--color-muted)' : 'var(--color-text)' }}>
                        {scaleAmount(item)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Cooking video */}
        {recipe.videoUrl && (
          <div>
            <h2 className="font-serif text-lg font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Cooking Video</h2>
            <video
              controls
              preload="metadata"
              src={imgSrc(recipe.videoUrl)!}
              className="w-full rounded-3xl bg-black aspect-video"
            >
              Your browser does not support embedded videos.
            </video>
          </div>
        )}

        {recipe.sourcePlatform === 'tiktok' && recipe.sourceUrl && (
          <a href={recipe.sourceUrl} target="_blank" rel="noreferrer"
            className="flex items-center gap-3 rounded-2xl border p-4 transition-colors hover:bg-[var(--color-hover)]"
            style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            {recipe.sourceThumbnailUrl && <img src={recipe.sourceThumbnailUrl} alt="" className="h-14 w-10 shrink-0 rounded-lg object-cover" />}
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold">Watch the original TikTok</span>
              <span className="block truncate text-xs" style={{ color: 'var(--color-muted)' }}>{recipe.sourceAuthor ? `By ${recipe.sourceAuthor}` : 'Source video'}</span>
            </span>
            <ExternalLink size={17} style={{ color: 'var(--color-muted)' }} />
          </a>
        )}

        {/* Instructions */}
        <div>
          <h2 className="font-serif text-lg font-semibold mb-4" style={{ color: 'var(--color-text)' }}>Instructions</h2>
          <div className="space-y-4">
            {(recipe.instructions as InstructionStep[]).map((step, i) => (
              <div key={i} className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-amber-800 text-white flex items-center justify-center text-sm font-bold shrink-0 mt-0.5">
                  {step.step ?? i + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text)' }}>{step.text}</p>
                  {step.timerMinutes && (
                    <button
                      onClick={() => startTimer(`Step ${step.step ?? i + 1}`, step.timerMinutes!, recipe.title)}
                      className="mt-2 flex items-center gap-1.5 text-xs font-medium text-amber-800"
                    >
                      <Timer size={13} />
                      Start {step.timerMinutes} min timer
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tips */}
        {recipe.tips && (recipe.tips as string[]).length > 0 && (
          <div className="rounded-2xl p-4 space-y-2" style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a' }}>
            <h3 className="text-sm font-semibold text-amber-800">💡 Tips</h3>
            {(recipe.tips as string[]).map((tip, i) => (
              <p key={i} className="text-sm text-amber-900 leading-relaxed">• {tip}</p>
            ))}
          </div>
        )}

        {/* Nutrition */}
        {recipe.nutrition && (
          <div>
            <h2 className="font-serif text-lg font-semibold mb-3" style={{ color: 'var(--color-text)' }}>Nutrition</h2>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(recipe.nutrition as Record<string, string>).map(([k, v]) => (
                <div key={k} className="px-3 py-2 rounded-xl" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{v}</p>
                  <p className="text-xs capitalize" style={{ color: 'var(--color-muted)' }}>{k}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rating */}
        <div className="rounded-2xl p-4 space-y-3" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg font-semibold" style={{ color: 'var(--color-text)' }}>Ratings</h2>
            {recipe.avgRating != null && (
              <div className="flex items-center gap-1.5">
                <Star size={16} className="text-amber-500 fill-amber-500" />
                <span className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>{recipe.avgRating.toFixed(1)}</span>
                <span className="text-xs" style={{ color: 'var(--color-muted)' }}>({recipe.ratingCount})</span>
              </div>
            )}
          </div>
          {user ? (
            <div>
              <p className="text-xs mb-2" style={{ color: 'var(--color-muted)' }}>{userScore ? 'Your rating' : 'Rate this recipe'}</p>
              <StarRow value={userScore} onChange={rate} />
            </div>
          ) : (
            <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
              <Link to="/login" className="text-amber-800 underline">Sign in</Link> to rate this recipe
            </p>
          )}
        </div>

        {/* Comments */}
        <div className="pb-6">
          <h2 className="font-serif text-lg font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
            Comments {comments.length > 0 && <span className="text-base font-normal" style={{ color: 'var(--color-muted)' }}>({comments.length})</span>}
          </h2>

          {user && (
            <div className="flex gap-3 mb-5">
              <div className="w-8 h-8 rounded-full bg-amber-800 text-white flex items-center justify-center text-xs font-bold shrink-0">
                {user.name?.[0]?.toUpperCase() ?? user.email[0].toUpperCase()}
              </div>
              <div className="flex-1 flex gap-2">
                <input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Share your thoughts…"
                  className="flex-1 text-sm px-4 py-2.5 rounded-2xl outline-none"
                  style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                  onKeyDown={(e) => e.key === 'Enter' && postComment()}
                />
                <button
                  onClick={postComment}
                  disabled={submittingComment || !commentText.trim()}
                  className="w-10 h-10 rounded-2xl bg-amber-800 flex items-center justify-center disabled:opacity-40"
                >
                  <Send size={16} className="text-white" />
                </button>
              </div>
            </div>
          )}

          {comments.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: 'var(--color-muted)' }}>No comments yet. Be the first!</p>
          ) : (
            <div className="space-y-5">
              {comments.map((c) => (
                <CommentItem key={c.id} comment={c} recipeSlug={slug!} onDelete={deleteComment} onLike={handleLike} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
