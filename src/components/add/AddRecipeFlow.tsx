import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/UIContext';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  Plus, Trash2, MoveUp, MoveDown, Sparkles, Eye,
  ArrowRight, ArrowLeft, X, Crop as CropIcon, Video, Upload, Link2, ExternalLink
} from 'lucide-react';
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { apiFetch } from '../../lib/apiFetch';

const PRESET_IMAGES = [
  { url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600', name: 'Fresh Bowl' },
  { url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600', name: 'Pizza' },
  { url: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600', name: 'Pancakes' },
  { url: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600', name: 'Fish' },
  { url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600', name: 'Burger' },
  { url: 'https://images.unsplash.com/photo-1558030006-450675393462?w=600', name: 'Steak' },
  { url: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=600', name: 'Dessert' },
  { url: 'https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?w=600', name: 'Pasta' },
];

const DIETARY_LIST = ['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'low-carb', 'nut-free', 'keto'];
const DIFFICULTY_LIST = ['Facile', 'Moyen', 'Difficile'];

interface IngRow { id: string; name: string; amount: string; unit: string }
interface IngSection { id: string; section: string; rows: IngRow[] }
interface StepRow { id: string; stepNumber: number; instruction: string; timerMinutes: string }

interface TranslationFields {
  title: string;
  description: string;
  ingredients: IngSection[];
  steps: StepRow[];
  tips: string;
}

interface TikTokImportSource {
  platform: 'tiktok';
  url: string;
  author: string | null;
  authorUrl: string | null;
  thumbnailUrl: string | null;
  caption: string;
}

interface TikTokImportResponse {
  source: TikTokImportSource;
  draft: {
    title: string;
    description: string;
    ingredients: { amount: string; unit: string; name: string }[];
    instructions: { step: number; text: string }[];
    tips: string[];
    tags: string[];
    warnings: string[];
  };
  error?: string;
}

type RecipeLanguage = 'fr' | 'en' | 'es';
const RECIPE_LANGUAGES: RecipeLanguage[] = ['fr', 'en', 'es'];

function emptyTranslation(): TranslationFields {
  return {
    title: '',
    description: '',
    ingredients: [{ id: '1', section: '', rows: [{ id: '1', name: '', amount: '', unit: '' }] }],
    steps: [{ id: '1', stepNumber: 1, instruction: '', timerMinutes: '' }],
    tips: '',
  };
}

function parseReferenceTags(value: string) {
  return [...new Set(
    value
      .split(/[\s,#]+/)
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean),
  )];
}

export default function AddRecipeFlow() {
  const { user } = useAuth();
  const { showToast } = useUI();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [stepPage, setStepPage] = useState<1 | 2 | 3>(1);
  const initialRecipeLanguage: RecipeLanguage = RECIPE_LANGUAGES.includes(language) ? language : 'en';
  const editLang = initialRecipeLanguage;
  const originalLanguage = initialRecipeLanguage;
  const [translations, setTranslations] = useState<Record<RecipeLanguage, TranslationFields>>({
    fr: emptyTranslation(),
    en: emptyTranslation(),
    es: emptyTranslation(),
  });

  // Shared fields
  const [slug, setSlug] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState<{ id: number; slug: string; label: string }[]>([]);
  const [difficulty, setDifficulty] = useState('Facile');
  const [prepTime, setPrepTime] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [servings, setServings] = useState(4);
  const [dietaryTags, setDietaryTags] = useState<string[]>([]);
  const [referenceTagsInput, setReferenceTagsInput] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);

  // Image
  const [coverImage, setCoverImage] = useState(PRESET_IMAGES[0].url);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Crop
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<Crop>();
  const cropImgRef = useRef<HTMLImageElement>(null);

  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [tiktokUrl, setTikTokUrl] = useState('');
  const [importingTikTok, setImportingTikTok] = useState(false);
  const [importedSource, setImportedSource] = useState<TikTokImportSource | null>(null);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);

  useEffect(() => {
    apiFetch('/api/categories')
      .then((r) => r.json())
      .then(setCategories)
      .catch(console.error);
  }, []);

  if (!user) {
    return (
      <div className="add-recipe-page flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6">
        <p className="text-center text-sm" style={{ color: 'var(--color-muted)' }}>Sign in to add recipes</p>
        <Link to="/login" className="add-recipe-primary px-6 py-3 rounded-2xl text-sm font-medium transition-colors">Sign in</Link>
      </div>
    );
  }

  const tr = translations[editLang];

  function setTr(updates: Partial<TranslationFields>) {
    setTranslations((prev) => ({ ...prev, [editLang]: { ...prev[editLang], ...updates } }));
  }

  function slugify(s: string) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  async function importFromTikTok() {
    if (!tiktokUrl.trim()) return;
    setImportingTikTok(true);
    try {
      const response = await apiFetch('/api/recipes/import/tiktok', {
        method: 'POST',
        body: JSON.stringify({ url: tiktokUrl.trim() }),
      });
      const payload: TikTokImportResponse = await response.json();
      if (!response.ok) throw new Error(payload.error || 'TikTok import failed');

      const ingredientSections = payload.draft.ingredients.length ? [{
        id: `tiktok-${Date.now()}`,
        section: 'main',
        rows: payload.draft.ingredients.map((item, index) => ({ id: `tiktok-ingredient-${Date.now()}-${index}`, ...item })),
      }] : null;
      const steps = payload.draft.instructions.length
        ? payload.draft.instructions.map((step, index) => ({ id: `tiktok-step-${Date.now()}-${index}`, stepNumber: step.step, instruction: step.text, timerMinutes: '' }))
        : null;

      setTranslations((previous) => ({
        ...previous,
        [editLang]: {
          ...previous[editLang],
          title: payload.draft.title || previous[editLang].title,
          description: payload.draft.description || previous[editLang].description,
          ingredients: ingredientSections || previous[editLang].ingredients,
          steps: steps || previous[editLang].steps,
          tips: payload.draft.tips.length ? payload.draft.tips.join('\n') : previous[editLang].tips,
        },
      }));
      setSlug((current) => current || slugify(payload.draft.title));
      setImportedSource(payload.source);
      setReferenceTagsInput((current) => {
        const tags = [...new Set([...parseReferenceTags(current), ...(payload.draft.tags || [])])];
        return tags.map((tag) => `#${tag}`).join(' ');
      });
      setImportWarnings(payload.draft.warnings);
      if (payload.source.thumbnailUrl) {
        setCoverImage(payload.source.thumbnailUrl);
        setImageFile(null);
      }
      showToast('TikTok draft imported', payload.draft.warnings.length ? 'Review the highlighted missing details before publishing.' : 'Ingredients and steps are ready for review.', 'success');
    } catch (error) {
      showToast('Could not import TikTok', error instanceof Error ? error.message : 'Try another public TikTok URL.', 'error');
    } finally {
      setImportingTikTok(false);
    }
  }

  // Section helpers
  function addSection() {
    setTr({ ingredients: [...tr.ingredients, { id: Date.now().toString(), section: '', rows: [{ id: Date.now().toString() + 'r', name: '', amount: '', unit: '' }] }] });
  }
  function removeSection(sid: string) {
    if (tr.ingredients.length <= 1) return;
    setTr({ ingredients: tr.ingredients.filter((s) => s.id !== sid) });
  }
  function updateSection(sid: string, section: string) {
    setTr({ ingredients: tr.ingredients.map((s) => s.id === sid ? { ...s, section } : s) });
  }
  // Ingredient row helpers
  function addIngredient(sid: string) {
    setTr({ ingredients: tr.ingredients.map((s) => s.id !== sid ? s : { ...s, rows: [...s.rows, { id: Date.now().toString(), name: '', amount: '', unit: '' }] }) });
  }
  function removeIngredient(sid: string, rid: string) {
    setTr({ ingredients: tr.ingredients.map((s) => s.id !== sid ? s : { ...s, rows: s.rows.filter((r) => r.id !== rid) }) });
  }
  function updateIngredient(sid: string, rid: string, field: keyof IngRow, value: string) {
    setTr({ ingredients: tr.ingredients.map((s) => s.id !== sid ? s : { ...s, rows: s.rows.map((r) => r.id === rid ? { ...r, [field]: value } : r) }) });
  }

  // Step helpers
  function addStep() {
    const next = tr.steps.length + 1;
    setTr({ steps: [...tr.steps, { id: Date.now().toString(), stepNumber: next, instruction: '', timerMinutes: '' }] });
  }
  function removeStep(id: string) {
    setTr({ steps: tr.steps.filter((s) => s.id !== id).map((s, i) => ({ ...s, stepNumber: i + 1 })) });
  }
  function updateStep(id: string, field: keyof StepRow, value: string) {
    setTr({ steps: tr.steps.map((s) => s.id === id ? { ...s, [field]: value } : s) });
  }
  function moveStep(idx: number, dir: 'up' | 'down') {
    const arr = [...tr.steps];
    const target = dir === 'up' ? idx - 1 : idx + 1;
    if (target < 0 || target >= arr.length) return;
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    setTr({ steps: arr.map((s, i) => ({ ...s, stepNumber: i + 1 })) });
  }

  function toggleDietary(tag: string) {
    setDietaryTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    // Reset input so same file can be re-selected
    e.target.value = '';
    const reader = new FileReader();
    reader.onloadend = () => {
      setCropSrc(reader.result as string);
      setCrop(undefined);
      setCompletedCrop(undefined);
    };
    reader.readAsDataURL(f);
  }

  function onCropImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
    const initial = centerCrop(makeAspectCrop({ unit: '%', width: 90 }, 1, w, h), w, h);
    setCrop(initial);
  }

  function applyCrop() {
    const img = cropImgRef.current;
    if (!img || !completedCrop) return;
    const canvas = document.createElement('canvas');
    const size = 800;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const scaleX = img.naturalWidth / img.width;
    const scaleY = img.naturalHeight / img.height;
    ctx.drawImage(
      img,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0, 0, size, size
    );
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], 'cover.jpg', { type: 'image/jpeg' });
      setImageFile(file);
      setCoverImage(URL.createObjectURL(blob));
      setCropSrc(null);
      showToast('Cover photo set!', undefined, 'success');
    }, 'image/jpeg', 0.92);
  }

  async function publish() {
    const originalTranslation = translations[originalLanguage];
    if (!originalTranslation.title.trim()) { showToast('Title required', 'Please fill in the recipe title', 'error'); return; }
    if (!slug) { showToast('Slug required', 'A URL slug is needed', 'error'); return; }
    if (!categoryId) { showToast('Category required', undefined, 'error'); return; }
    if (tr.ingredients.length > 1 && tr.ingredients.some((s) => !s.section.trim())) {
      showToast('Section names required', 'Please name all ingredient sections', 'error'); return;
    }

    setSubmitting(true);
    try {
      const totalTime = prepTime && cookTime
        ? `${parseInt(prepTime) + parseInt(cookTime)} min`
        : prepTime ? `${prepTime} min` : cookTime ? `${cookTime} min` : undefined;

      const info = {
        prepTime: prepTime ? `${prepTime} min` : undefined,
        cookTime: cookTime ? `${cookTime} min` : undefined,
        totalTime,
        servings,
        difficulty,
      };

      const translationRows = [originalLanguage]
        .filter((l) => translations[l].title.trim())
        .map((l) => {
          const t = translations[l];
          return {
            language: l,
            title: t.title.trim(),
            description: t.description.trim() || undefined,
            ingredients: t.ingredients.map((s) => ({
              section: s.section || 'main',
              items: s.rows.filter((r) => r.name.trim()).map((r) => `${r.amount} ${r.unit} ${r.name}`.trim()),
            })).filter((s) => s.items.length > 0),
            instructions: t.steps.filter((s) => s.instruction.trim()).map((s) => ({
              step: s.stepNumber,
              text: s.instruction.trim(),
              timerMinutes: s.timerMinutes ? parseInt(s.timerMinutes) : undefined,
            })),
            tips: t.tips ? t.tips.split('\n').filter(Boolean) : undefined,
          };
        });

      const fd = new FormData();
      fd.append('slug', slug);
      fd.append('categoryId', categoryId);
      fd.append('info', JSON.stringify(info));
      fd.append('tags', JSON.stringify([...new Set([...dietaryTags, ...parseReferenceTags(referenceTagsInput)])]));
      fd.append('originalLanguage', originalLanguage);
      fd.append('translations', JSON.stringify(translationRows));
      if (importedSource) {
        fd.append('sourcePlatform', importedSource.platform);
        fd.append('sourceUrl', importedSource.url);
        if (importedSource.author) fd.append('sourceAuthor', importedSource.author);
        if (importedSource.thumbnailUrl) fd.append('sourceThumbnailUrl', importedSource.thumbnailUrl);
      }
      if (imageFile) {
        fd.append('image', imageFile);
      }
      if (videoFile) {
        fd.append('video', videoFile);
      }

      const res = await apiFetch('/api/recipes', { method: 'POST', body: fd });
      if (res.ok) {
        const d = await res.json();
        showToast('Recipe published!', undefined, 'success');
        navigate(`/recipe/${d.slug}`);
      } else {
        const d = await res.json();
        showToast(d.error ?? 'Failed to publish', undefined, 'error');
      }
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls = "w-full bg-stone-50 border border-stone-200 text-stone-900 text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-800/30 font-medium";
  const labelCls = "text-xs font-bold text-stone-700 uppercase tracking-wider";

  return (
    <div className="add-recipe-page max-w-2xl mx-auto px-4 space-y-6 py-4 pb-24">

      {/* Header */}
      <div className="p-5 rounded-3xl border border-stone-200/80 shadow-sm flex items-center justify-between"
        style={{ backgroundColor: 'var(--color-surface)' }}>
        <div>
          <h1 className="font-serif text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Publish New Recipe</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>Share your culinary masterpiece with the world</p>
        </div>
        <button onClick={() => setShowPreview(true)}
          className="add-recipe-accent-soft flex items-center gap-1.5 text-xs font-bold border px-3 py-2 rounded-2xl transition-colors">
          <Eye className="w-4 h-4" /> Preview
        </button>
      </div>

      {/* Stepper */}
      <div className="add-recipe-tab-group grid grid-cols-3 gap-2 p-1.5 rounded-2xl border">
        {([1, 2, 3] as const).map((n) => (
          <button key={n} onClick={() => setStepPage(n)}
            className={`add-recipe-tab py-2 text-xs font-bold rounded-xl transition-all ${stepPage === n ? 'add-recipe-tab--active' : ''}`}>
            {n === 1 ? '1. Basic Info' : n === 2 ? '2. Ingredients & Steps' : '3. Tags & Publish'}
          </button>
        ))}
      </div>

      {/* STEP 1: BASIC INFO */}
      {stepPage === 1 && (
        <section className="p-6 rounded-3xl border border-stone-200/80 shadow-sm space-y-5"
          style={{ backgroundColor: 'var(--color-surface)' }}>

          <div className="rounded-2xl border p-4 space-y-3" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-subtle)' }}>
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-stone-900 text-white"><Link2 size={17} /></span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>Import from TikTok</p>
                <p className="text-[11px]" style={{ color: 'var(--color-muted)' }}>Paste your public video link. Savor creates an editable draft for your recipe book.</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input type="url" value={tiktokUrl} onChange={(event) => setTikTokUrl(event.target.value)}
                placeholder="https://www.tiktok.com/@chef/video/..." className={`${inputCls} flex-1`} />
              <button type="button" onClick={importFromTikTok} disabled={importingTikTok || !tiktokUrl.trim()}
                className="add-recipe-primary shrink-0 rounded-xl px-4 py-3 text-xs font-bold disabled:opacity-50">
                {importingTikTok ? 'Importing…' : 'Create draft'}
              </button>
            </div>
            {importedSource && (
              <div className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
                <div className="min-w-0"><p className="truncate text-xs font-bold">TikTok connected{importedSource.author ? ` · ${importedSource.author}` : ''}</p><p className="text-[10px]" style={{ color: 'var(--color-muted)' }}>This source will be credited on the published recipe.</p></div>
                <a href={importedSource.url} target="_blank" rel="noreferrer" aria-label="Open source TikTok"><ExternalLink size={15} /></a>
              </div>
            )}
            {importWarnings.length > 0 && (
              <ul className="space-y-1 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
                {importWarnings.map((warning) => <li key={warning}>• {warning}</li>)}
              </ul>
            )}
          </div>

          {/* Cover image */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className={labelCls}>Cover Photo</label>
              <button type="button" onClick={() => setShowImagePicker(true)}
                className="add-recipe-accent hover:underline text-xs font-semibold">
                Choose preset
              </button>
            </div>
            <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden bg-stone-100 border border-stone-200 group">
              <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-stone-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                <label className="bg-white text-stone-900 text-xs font-bold px-4 py-2 rounded-xl cursor-pointer hover:bg-stone-100 shadow-md">
                  Upload File
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                </label>
                <button type="button" onClick={() => setShowImagePicker(true)}
                  className="bg-stone-900 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-amber-800 shadow-md">
                  Presets
                </button>
              </div>
            </div>
          </div>

          {/* Title & description */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className={labelCls}>Recipe Title *</label>
              <input type="text" value={tr.title}
                onChange={(e) => { setTr({ title: e.target.value }); if (!slug) setSlug(slugify(e.target.value)); }}
                placeholder="e.g. Truffle & Wild Mushroom Tagliatelle"
                className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Short Description</label>
              <textarea rows={3} value={tr.description} onChange={(e) => setTr({ description: e.target.value })}
                placeholder="Describe the flavor, texture, and story…"
                className="w-full bg-stone-50 border border-stone-200 text-stone-900 text-xs rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-amber-800/30 resize-none font-medium" />
            </div>
          </div>

          {/* Slug & category */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className={labelCls}>URL Slug *</label>
              <input type="text" value={slug} onChange={(e) => setSlug(slugify(e.target.value))}
                placeholder="my-recipe-slug"
                className="w-full bg-stone-50 border border-stone-200 text-stone-900 text-xs font-mono rounded-xl px-3 py-2.5 focus:outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Category *</label>
              <select value={categoryId} onChange={(e) => { if (e.target.value === '__new__') { setCreatingCategory(true); } else { setCreatingCategory(false); setCategoryId(e.target.value); } }}
                className="w-full bg-stone-50 border border-stone-200 text-stone-900 text-xs font-bold rounded-xl px-3 py-2.5 focus:outline-none">
                <option value="">Select…</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                <option value="__new__">+ New category…</option>
              </select>
              {creatingCategory && (
                <div className="flex gap-2 mt-1">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Category name…"
                    className="flex-1 bg-stone-50 border border-stone-200 text-stone-900 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={!newCategoryName.trim()}
                    onClick={async () => {
                      if (!newCategoryName.trim()) return;
                      try {
                        const res = await apiFetch('/api/categories', {
                          method: 'POST',
                          body: JSON.stringify({ label: newCategoryName.trim() }),
                        });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error || 'Failed');
                        setCategories((prev) => [...prev, data]);
                        setCategoryId(String(data.id));
                        setCreatingCategory(false);
                        setNewCategoryName('');
                      } catch (err: unknown) {
                        showToast('Failed to create category', err instanceof Error ? err.message : '', 'error');
                      }
                    }}
                    className="add-recipe-primary text-xs font-bold px-3 py-2 rounded-xl disabled:opacity-40 transition-colors whitespace-nowrap"
                  >
                    Create
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Prep (min)', value: prepTime, onChange: setPrepTime, placeholder: '15' },
              { label: 'Cook (min)', value: cookTime, onChange: setCookTime, placeholder: '30' },
            ].map(({ label, value, onChange, placeholder }) => (
              <div key={label} className="space-y-1">
                <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">{label}</label>
                <input type="number" min={0} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
                  className="w-full bg-stone-50 border border-stone-200 text-stone-900 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none text-center" />
              </div>
            ))}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Servings</label>
              <input type="number" min={1} value={servings} onChange={(e) => setServings(parseInt(e.target.value) || 1)}
                className="w-full bg-stone-50 border border-stone-200 text-stone-900 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none text-center" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Difficulty</label>
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 text-stone-900 text-xs font-bold rounded-xl px-2 py-2 focus:outline-none">
                {DIFFICULTY_LIST.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <button onClick={() => setStepPage(2)}
              className="add-recipe-primary flex items-center gap-2 font-bold text-xs px-6 py-3 rounded-2xl transition-colors shadow-md">
              Next: Ingredients & Steps <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>
      )}

      {/* STEP 2: INGREDIENTS & STEPS */}
      {stepPage === 2 && (
        <div className="space-y-6">
          {/* Ingredients */}
          <section className="p-6 rounded-3xl border border-stone-200/80 shadow-sm space-y-4"
            style={{ backgroundColor: 'var(--color-surface)' }}>
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h2 className="font-serif text-lg font-bold" style={{ color: 'var(--color-text)' }}>Ingredients List</h2>
                <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Group by section (e.g. Brownie, Cookie)</p>
              </div>
              <button type="button" onClick={addSection}
                className="add-recipe-accent-soft flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl transition-colors">
                <Plus className="w-3.5 h-3.5" /> Add Section
              </button>
            </div>

            <div className="space-y-5">
              {tr.ingredients.map((sec) => (
                <div key={sec.id} className="space-y-2">
                  {/* Section header — only shown when there are multiple sections */}
                  {tr.ingredients.length > 1 && (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Section name (e.g. Brownie batter) *"
                        value={sec.section}
                        onChange={(e) => updateSection(sec.id, e.target.value)}
                        required
                        className="flex-1 bg-white text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-800/30"
                        style={{
                          border: `1px solid ${sec.section.trim() === '' ? '#fca5a5' : 'var(--color-border)'}`,
                          color: 'var(--color-text)',
                        }}
                      />
                      <button type="button" onClick={() => removeSection(sec.id)}
                        className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-stone-100 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Rows */}
                  <div className="space-y-2 pl-3 border-l-2 border-stone-200">
                    {sec.rows.map((row, idx) => (
                      <div key={row.id} className="bg-stone-50 p-2.5 rounded-2xl border border-stone-200/80 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-stone-400 w-5 text-center shrink-0">{idx + 1}.</span>
                          <input type="text" placeholder="Ingredient name…" value={row.name}
                            onChange={(e) => updateIngredient(sec.id, row.id, 'name', e.target.value)}
                            className="flex-1 bg-white text-xs border border-stone-200 rounded-xl px-3 py-2 font-medium focus:outline-none" />
                          <button type="button" onClick={() => removeIngredient(sec.id, row.id)}
                            disabled={sec.rows.length === 1}
                            className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-stone-200 transition-colors disabled:opacity-30">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex gap-2 pl-7">
                          <input type="text" value={row.amount} onChange={(e) => updateIngredient(sec.id, row.id, 'amount', e.target.value)}
                            placeholder="Amount"
                            className="flex-1 bg-white text-xs border border-stone-200 rounded-xl px-3 py-2 font-bold text-center focus:outline-none" />
                          <input type="text" placeholder="Unit (g, tbsp…)" value={row.unit}
                            onChange={(e) => updateIngredient(sec.id, row.id, 'unit', e.target.value)}
                            className="flex-1 bg-white text-xs border border-stone-200 rounded-xl px-3 py-2 focus:outline-none" />
                        </div>
                      </div>
                    ))}
                    <button type="button" onClick={() => addIngredient(sec.id)}
                      className="flex items-center gap-1 text-xs font-semibold text-stone-500 hover:text-amber-800 transition-colors ml-1">
                      <Plus className="w-3.5 h-3.5" /> Add ingredient
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Steps */}
          <section className="p-6 rounded-3xl border border-stone-200/80 shadow-sm space-y-4"
            style={{ backgroundColor: 'var(--color-surface)' }}>
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h2 className="font-serif text-lg font-bold" style={{ color: 'var(--color-text)' }}>Preparation Steps</h2>
                <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Order steps logically, add timer durations</p>
              </div>
              <button type="button" onClick={addStep}
                className="add-recipe-accent-soft flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl transition-colors">
                <Plus className="w-3.5 h-3.5" /> Add Step
              </button>
            </div>
            <div className="space-y-4">
              {tr.steps.map((st, idx) => (
                <div key={st.id} className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="add-recipe-accent-soft text-xs font-bold px-2.5 py-1 rounded-full">Step {st.stepNumber}</span>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => moveStep(idx, 'up')} disabled={idx === 0}
                        className="p-1 text-stone-500 hover:text-stone-900 disabled:opacity-30">
                        <MoveUp className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" onClick={() => moveStep(idx, 'down')} disabled={idx === tr.steps.length - 1}
                        className="p-1 text-stone-500 hover:text-stone-900 disabled:opacity-30">
                        <MoveDown className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" onClick={() => removeStep(st.id)}
                        className="p-1 text-stone-400 hover:text-rose-600 ml-2">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <textarea rows={3} placeholder="Describe what to do in this step…" value={st.instruction}
                    onChange={(e) => updateStep(st.id, 'instruction', e.target.value)}
                    className="w-full bg-white text-xs border border-stone-200 rounded-xl p-3 focus:outline-none resize-none" />
                  <input type="number" placeholder="Timer in minutes (optional)" value={st.timerMinutes}
                    onChange={(e) => updateStep(st.id, 'timerMinutes', e.target.value)}
                    className="w-full bg-white text-xs border border-stone-200 rounded-xl px-3 py-2 focus:outline-none font-mono" />
                </div>
              ))}
            </div>
          </section>

          <div className="flex items-center justify-between pt-2">
            <button onClick={() => setStepPage(1)}
              className="add-recipe-secondary flex items-center gap-1.5 font-bold text-xs px-5 py-3 rounded-2xl transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button onClick={() => setStepPage(3)}
              className="add-recipe-primary flex items-center gap-2 font-bold text-xs px-6 py-3 rounded-2xl transition-colors shadow-md">
              Next: Tags & Publish <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: TAGS & PUBLISH */}
      {stepPage === 3 && (
        <section className="p-6 rounded-3xl border border-stone-200/80 shadow-sm space-y-6"
          style={{ backgroundColor: 'var(--color-surface)' }}>

          {/* Dietary tags */}
          <div className="space-y-2">
            <label className={labelCls}>Dietary Tags</label>
            <div className="flex flex-wrap gap-2">
              {DIETARY_LIST.map((tag) => (
                <button type="button" key={tag} onClick={() => toggleDietary(tag)}
                  className={`add-recipe-tab px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all capitalize ${dietaryTags.includes(tag) ? 'add-recipe-tab--active' : 'add-recipe-tab-group'}`}>
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Search and reference tags */}
          <div className="space-y-2">
            <label className={labelCls}>Search Tags</label>
            <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
              Help people find this recipe. Separate tags with spaces or commas.
            </p>
            <input
              type="text"
              value={referenceTagsInput}
              onChange={(event) => setReferenceTagsInput(event.target.value)}
              placeholder="#creamypasta #weeknight #comfortfood"
              className="w-full bg-stone-50 border border-stone-200 text-stone-900 text-xs rounded-xl px-3 py-3 focus:outline-none font-medium"
            />
            {parseReferenceTags(referenceTagsInput).length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {parseReferenceTags(referenceTagsInput).map((tag) => (
                  <span key={tag} className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-900">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Cooking video */}
          <div className="space-y-2">
            <label className={labelCls}>Cooking Video (optional)</label>
            <label className="flex items-center gap-3 rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-4 cursor-pointer hover:border-amber-700 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <Video className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-stone-800 truncate">
                  {videoFile ? videoFile.name : 'Add a video of you cooking'}
                </p>
                <p className="text-xs text-stone-500">
                  {videoFile ? `${(videoFile.size / 1024 / 1024).toFixed(1)} MB` : 'MP4 or WebM, up to 100 MB'}
                </p>
              </div>
              <Upload className="w-5 h-5 text-stone-500" />
              <input
                type="file"
                accept="video/mp4,video/webm"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  if (file && file.size > 100 * 1024 * 1024) {
                    showToast('Video is too large', 'Choose a video under 100 MB', 'error');
                    e.target.value = '';
                    return;
                  }
                  setVideoFile(file);
                }}
              />
            </label>
            {videoFile && (
              <button type="button" onClick={() => setVideoFile(null)} className="flex items-center gap-1 text-xs font-medium text-rose-700">
                <X className="w-3.5 h-3.5" /> Remove video
              </button>
            )}
          </div>

          {/* Tips */}
          <div className="space-y-2">
            <label className={labelCls}>Tips — one per line</label>
            <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
              Add substitutions, technique notes, or serving advice.
            </p>
            <textarea rows={3} value={tr.tips} onChange={(e) => setTr({ tips: e.target.value })}
              placeholder={'e.g. Reserve pasta water before draining\nSubstitute with lemon juice'}
              className="w-full bg-stone-50 border border-stone-200 text-stone-900 text-xs rounded-xl p-3 focus:outline-none resize-none font-medium" />
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-stone-100">
            <button type="button" onClick={() => setStepPage(2)}
              className="add-recipe-secondary flex items-center gap-1.5 font-bold text-xs px-5 py-3 rounded-2xl transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button type="button" onClick={publish} disabled={submitting}
              className="add-recipe-primary flex items-center gap-2 font-bold text-xs px-8 py-3.5 rounded-2xl transition-colors shadow-lg disabled:opacity-50">
              <Sparkles className="w-4 h-4" />
              {submitting ? 'Publishing…' : 'Publish Recipe Now'}
            </button>
          </div>
        </section>
      )}

      {/* Crop Modal */}
      {cropSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/70 backdrop-blur-sm"
          onClick={() => setCropSrc(null)}>
          <div className="add-recipe-modal w-full max-w-lg rounded-3xl p-6 shadow-2xl border space-y-4"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <CropIcon className="w-5 h-5 text-amber-800" />
                <h3 className="font-serif text-lg font-bold text-stone-900">Crop Cover Photo</h3>
              </div>
              <button onClick={() => setCropSrc(null)} className="p-1 text-stone-400 hover:text-stone-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-stone-500">Drag the selection to choose your cover area. The crop is always square.</p>
            <div className="flex justify-center max-h-[55vh] overflow-auto rounded-2xl bg-stone-100">
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={1}
                circularCrop={false}
                className="max-w-full"
              >
                <img
                  ref={cropImgRef}
                  src={cropSrc}
                  onLoad={onCropImageLoad}
                  className="max-w-full max-h-[50vh] object-contain"
                  alt="Crop source"
                />
              </ReactCrop>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setCropSrc(null)}
                className="add-recipe-secondary flex-1 py-3 text-xs font-semibold rounded-xl transition-colors">
                Cancel
              </button>
              <button onClick={applyCrop} disabled={!completedCrop}
                className="add-recipe-primary flex-1 py-3 text-xs font-semibold rounded-xl transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5">
                <CropIcon className="w-3.5 h-3.5" /> Apply Crop
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Picker Modal */}
      {showImagePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm"
          onClick={() => setShowImagePicker(false)}>
          <div className="add-recipe-modal w-full max-w-lg rounded-3xl p-6 shadow-2xl border max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
              <h3 className="font-serif text-lg font-bold text-stone-900">Select Food Photography</h3>
              <button onClick={() => setShowImagePicker(false)} className="p-1 text-stone-400 hover:text-stone-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {PRESET_IMAGES.map((item) => (
                <button key={item.url} onClick={() => { setCoverImage(item.url); setImageFile(null); setShowImagePicker(false); }}
                  className="group relative aspect-square rounded-2xl overflow-hidden border border-stone-200 hover:ring-4 hover:ring-amber-700/50 transition-all">
                  <img src={item.url} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-transparent flex items-end p-2.5">
                    <span className="text-xs font-bold text-white">{item.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm"
          onClick={() => setShowPreview(false)}>
          <div className="add-recipe-modal w-full max-w-2xl rounded-3xl p-6 shadow-2xl border max-h-[90vh] overflow-y-auto space-y-4"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800">Recipe Preview</span>
              <button onClick={() => setShowPreview(false)} className="p-1 text-stone-500 hover:text-stone-900">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="aspect-[16/9] rounded-2xl overflow-hidden bg-stone-200">
              <img src={coverImage} alt="Preview" className="w-full h-full object-cover" />
            </div>
            <h2 className="font-serif text-2xl font-bold text-stone-900">{translations[originalLanguage].title || 'Untitled Recipe'}</h2>
            <p className="text-xs text-stone-600">{translations[originalLanguage].description || 'No description.'}</p>
            {[...new Set([...dietaryTags, ...parseReferenceTags(referenceTagsInput)])].length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {[...new Set([...dietaryTags, ...parseReferenceTags(referenceTagsInput)])].map((tag) => (
                  <span key={tag} className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-900">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
            {translations[originalLanguage].ingredients.some((s) => s.rows.some((r) => r.name)) && (
              <div className="bg-white p-4 rounded-2xl border border-stone-200">
                <p className="text-xs font-bold text-stone-900 mb-2">Ingredients</p>
                {translations[originalLanguage].ingredients.map((sec) => (
                  <div key={sec.id} className="mb-2">
                    {sec.section && <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wide mb-1">{sec.section}</p>}
                    <ul className="list-disc list-inside text-xs text-stone-700 space-y-0.5">
                      {sec.rows.filter((r) => r.name).map((r) => (
                        <li key={r.id}>{[r.amount, r.unit, r.name].filter(Boolean).join(' ')}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
            {translations[originalLanguage].steps.some((step) => step.instruction.trim()) && (
              <div className="bg-white p-4 rounded-2xl border border-stone-200">
                <p className="text-xs font-bold text-stone-900 mb-3">Preparation Steps</p>
                <ol className="space-y-3">
                  {translations[originalLanguage].steps.filter((step) => step.instruction.trim()).map((step, index) => (
                    <li key={step.id} className="flex gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-800 text-[10px] font-bold text-white">{index + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs leading-relaxed text-stone-700">{step.instruction}</p>
                        {step.timerMinutes && <p className="mt-1 text-[10px] font-bold text-amber-800">Timer: {step.timerMinutes} min</p>}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            {translations[originalLanguage].tips.split('\n').some((tip) => tip.trim()) && (
              <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200">
                <p className="text-xs font-bold text-stone-900 mb-2">Tips</p>
                <ul className="list-disc list-inside text-xs text-stone-700 space-y-1">
                  {translations[originalLanguage].tips.split('\n').filter((tip) => tip.trim()).map((tip, index) => (
                    <li key={`${tip}-${index}`}>{tip.trim()}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
