import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ReactCrop, { centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { useAuth } from "../../contexts/AuthContext";
import "./AddRecipe.css";

function slugify(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function AddRecipe() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [user, loading, navigate]);

  // Basic info
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState([]);

  // Photo + crop
  const [imageSrc, setImageSrc] = useState(null);       // raw data URL for cropper
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState();
  const [showCropModal, setShowCropModal] = useState(false);
  const [imagePreview, setImagePreview] = useState(null); // final cropped preview
  const [imageFile, setImageFile] = useState(null);       // final cropped File
  const imgRef = useRef(null);
  const fileInputRef = useRef();

  // Info block
  const [info, setInfo] = useState({
    prepTime: "", cookTime: "", totalTime: "", servings: "", difficulty: "",
  });

  // Ingredients: [{ section, items: [string] }]
  const [ingredients, setIngredients] = useState([
    { section: "", items: [""] },
  ]);

  // Instructions: [string]
  const [instructions, setInstructions] = useState([""]);

  // Tips: [string]
  const [tips, setTips] = useState([""]);

  // Submit state
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Fetch categories
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/categories`)
      .then((r) => r.json())
      .then(setCategories)
      .catch(() => {});
  }, []);

  // Auto-slug from title
  useEffect(() => {
    setSlug(slugify(title));
  }, [title]);

  // Image pick → open crop modal
  function handleImageChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result);
      setShowCropModal(true);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  // When the image loads inside the cropper, center a square crop
  const onImageLoad = useCallback((e) => {
    imgRef.current = e.currentTarget;
    const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
    const c = centerCrop(makeAspectCrop({ unit: "%", width: 80 }, 1, w, h), w, h);
    setCrop(c);
    setCompletedCrop(c);
  }, []);

  // Confirm crop → canvas → blob → File → preview URL
  function confirmCrop() {
    const img = imgRef.current;
    if (!img || !completedCrop) return;

    const canvas = document.createElement("canvas");
    const size = 600;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");

    const scaleX = img.naturalWidth / img.width;
    const scaleY = img.naturalHeight / img.height;

    const pixelCrop = {
      x: completedCrop.x * scaleX,
      y: completedCrop.y * scaleY,
      width: completedCrop.width * scaleX,
      height: completedCrop.height * scaleY,
    };

    ctx.drawImage(img, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, size, size);

    canvas.toBlob((blob) => {
      const file = new File([blob], "photo.jpg", { type: "image/jpeg" });
      setImageFile(file);
      setImagePreview(URL.createObjectURL(blob));
      setShowCropModal(false);
      setImageSrc(null);
    }, "image/jpeg", 0.9);
  }

  // -------- Ingredients helpers --------
  function addSection() {
    setIngredients([...ingredients, { section: "", items: [""] }]);
  }
  function removeSection(si) {
    setIngredients(ingredients.filter((_, i) => i !== si));
  }
  function updateSectionName(si, val) {
    setIngredients(ingredients.map((s, i) => i === si ? { ...s, section: val } : s));
  }
  function addItem(si) {
    setIngredients(ingredients.map((s, i) => i === si ? { ...s, items: [...s.items, ""] } : s));
  }
  function removeItem(si, ii) {
    setIngredients(ingredients.map((s, i) =>
      i === si ? { ...s, items: s.items.filter((_, j) => j !== ii) } : s
    ));
  }
  function updateItem(si, ii, val) {
    setIngredients(ingredients.map((s, i) =>
      i === si ? { ...s, items: s.items.map((item, j) => j === ii ? val : item) } : s
    ));
  }

  // -------- Instructions helpers --------
  function addStep() { setInstructions([...instructions, ""]); }
  function removeStep(i) { setInstructions(instructions.filter((_, j) => j !== i)); }
  function updateStep(i, val) { setInstructions(instructions.map((s, j) => j === i ? val : s)); }

  // -------- Tips helpers --------
  function addTip() { setTips([...tips, ""]); }
  function removeTip(i) { setTips(tips.filter((_, j) => j !== i)); }
  function updateTip(i, val) { setTips(tips.map((t, j) => j === i ? val : t)); }

  // -------- Submit --------
  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!title || !slug || !categoryId) {
      setError("Titre, slug et catégorie sont requis.");
      return;
    }
    const filledIngredients = ingredients.filter(s => s.items.some(i => i.trim()));
    const filledInstructions = instructions.filter(s => s.trim());
    if (!filledIngredients.length || !filledInstructions.length) {
      setError("Ajoutez au moins un ingrédient et une étape.");
      return;
    }

    setSubmitting(true);

    const formData = new FormData();
    formData.append("title", title);
    formData.append("slug", slug);
    formData.append("categoryId", categoryId);
    formData.append("description", description);
    formData.append("lang", "fr");

    const infoObj = Object.fromEntries(
      Object.entries(info).filter(([, v]) => v.trim())
    );
    if (Object.keys(infoObj).length) formData.append("info", JSON.stringify(infoObj));

    formData.append(
      "ingredients",
      JSON.stringify(filledIngredients.map(s => ({
        section: s.section,
        items: s.items.filter(i => i.trim()),
      })))
    );
    formData.append(
      "instructions",
      JSON.stringify(filledInstructions.map((text, i) => ({ step: i + 1, text })))
    );

    const filledTips = tips.filter(t => t.trim());
    if (filledTips.length) formData.append("tips", JSON.stringify(filledTips));

    if (imageFile) formData.append("image", imageFile);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/recipes`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de la création");
      navigate(`/recipe/${data.slug}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return null;

  return (
    <div className="add-recipe-page">
      <div className="add-recipe-card">
        <div className="add-recipe-header">
          <button className="add-recipe-back" onClick={() => navigate("/")}>← Retour</button>
          <h1>Nouvelle recette</h1>
        </div>

        <form className="add-recipe-form" onSubmit={handleSubmit}>
          {error && <div className="add-recipe-error">{error}</div>}

          {/* ---- BASIC INFO ---- */}
          <section className="ar-section">
            <h2>Informations de base</h2>

            <div className="ar-field">
              <label>Titre *</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Ex : Tarte aux pommes"
                required
              />
            </div>

            <div className="ar-field">
              <label>Catégorie *</label>
              <select value={categoryId} onChange={e => setCategoryId(e.target.value)} required>
                <option value="">— Choisir —</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>

            <div className="ar-field">
              <label>Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Courte description de la recette…"
                rows={3}
              />
            </div>
          </section>

          {/* ---- PHOTO ---- */}
          <section className="ar-section">
            <h2>Photo</h2>
            <div
              className="ar-photo-drop"
              onClick={() => fileInputRef.current.click()}
            >
              {imagePreview ? (
                <>
                  <img src={imagePreview} alt="preview" className="ar-photo-preview" />
                  <button
                    type="button"
                    className="ar-photo-remove"
                    onClick={e => { e.stopPropagation(); setImagePreview(null); setImageFile(null); }}
                  >✕</button>
                </>
              ) : (
                <span className="ar-photo-placeholder">📷 Cliquez pour ajouter une photo</span>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: "none" }}
              onChange={handleImageChange}
            />
          </section>

          {/* ---- CROP MODAL ---- */}
          {showCropModal && (
            <div className="crop-overlay" onClick={() => setShowCropModal(false)}>
              <div className="crop-modal" onClick={e => e.stopPropagation()}>
                <h3>Recadrer la photo</h3>
                <div className="crop-container">
                  <ReactCrop
                    crop={crop}
                    onChange={c => setCrop(c)}
                    onComplete={c => setCompletedCrop(c)}
                    aspect={1}
                    circularCrop={false}
                  >
                    <img
                      src={imageSrc}
                      alt="crop source"
                      onLoad={onImageLoad}
                      className="crop-img"
                    />
                  </ReactCrop>
                </div>
                <div className="crop-actions">
                  <button type="button" className="crop-cancel" onClick={() => setShowCropModal(false)}>Annuler</button>
                  <button type="button" className="crop-confirm" onClick={confirmCrop}>Confirmer</button>
                </div>
              </div>
            </div>
          )}

          {/* ---- INFO BLOCK ---- */}
          <section className="ar-section">
            <h2>Détails</h2>
            <div className="ar-info-grid">
              {[
                { key: "prepTime", label: "Préparation" },
                { key: "cookTime", label: "Cuisson" },
                { key: "totalTime", label: "Temps total" },
                { key: "servings", label: "Portions" },
                { key: "difficulty", label: "Difficulté" },
              ].map(({ key, label }) => (
                <div className="ar-field" key={key}>
                  <label>{label}</label>
                  <input
                    type="text"
                    value={info[key]}
                    onChange={e => setInfo({ ...info, [key]: e.target.value })}
                    placeholder={key === "servings" ? "4" : key === "difficulty" ? "Facile" : "30 min"}
                  />
                </div>
              ))}
            </div>
          </section>

          {/* ---- INGREDIENTS ---- */}
          <section className="ar-section">
            <h2>Ingrédients</h2>
            {ingredients.map((sec, si) => (
              <div key={si} className="ar-ingredient-section">
                <div className="ar-section-row">
                  <input
                    type="text"
                    value={sec.section}
                    onChange={e => updateSectionName(si, e.target.value)}
                    placeholder="Nom de la section (optionnel)"
                    className="ar-section-name"
                  />
                  {ingredients.length > 1 && (
                    <button type="button" className="ar-btn-remove" onClick={() => removeSection(si)}>✕</button>
                  )}
                </div>
                {sec.items.map((item, ii) => (
                  <div key={ii} className="ar-item-row">
                    <input
                      type="text"
                      value={item}
                      onChange={e => updateItem(si, ii, e.target.value)}
                      placeholder="Ex : 200g de farine"
                    />
                    {sec.items.length > 1 && (
                      <button type="button" className="ar-btn-remove" onClick={() => removeItem(si, ii)}>✕</button>
                    )}
                  </div>
                ))}
                <button type="button" className="ar-btn-add" onClick={() => addItem(si)}>+ Ingrédient</button>
              </div>
            ))}
            <button type="button" className="ar-btn-add-section" onClick={addSection}>+ Section</button>
          </section>

          {/* ---- INSTRUCTIONS ---- */}
          <section className="ar-section">
            <h2>Étapes</h2>
            {instructions.map((step, i) => (
              <div key={i} className="ar-step-row">
                <span className="ar-step-num">{i + 1}</span>
                <textarea
                  value={step}
                  onChange={e => updateStep(i, e.target.value)}
                  placeholder={`Étape ${i + 1}…`}
                  rows={2}
                />
                {instructions.length > 1 && (
                  <button type="button" className="ar-btn-remove" onClick={() => removeStep(i)}>✕</button>
                )}
              </div>
            ))}
            <button type="button" className="ar-btn-add" onClick={addStep}>+ Étape</button>
          </section>

          {/* ---- TIPS ---- */}
          <section className="ar-section">
            <h2>Conseils <span className="ar-optional">(optionnel)</span></h2>
            {tips.map((tip, i) => (
              <div key={i} className="ar-item-row">
                <input
                  type="text"
                  value={tip}
                  onChange={e => updateTip(i, e.target.value)}
                  placeholder="Astuce ou conseil…"
                />
                {tips.length > 1 && (
                  <button type="button" className="ar-btn-remove" onClick={() => removeTip(i)}>✕</button>
                )}
              </div>
            ))}
            <button type="button" className="ar-btn-add" onClick={addTip}>+ Conseil</button>
          </section>

          {/* ---- SUBMIT ---- */}
          <button type="submit" className="ar-submit" disabled={submitting}>
            {submitting ? "Enregistrement…" : "Publier la recette"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AddRecipe;
