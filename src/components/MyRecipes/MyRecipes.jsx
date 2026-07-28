import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import "./MyRecipes.css";

function MyRecipes() {
  const { user, loading } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();

  const [tab, setTab] = useState("mine");
  const [myRecipes, setMyRecipes] = useState([]);
  const [savedRecipes, setSavedRecipes] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [deleting, setDeleting] = useState(new Set());

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    const API = import.meta.env.VITE_API_URL;
    setFetching(true);
    Promise.all([
      fetch(`${API}/api/my-recipes?lang=${language}`, { credentials: "include" }).then((r) => r.json()),
      fetch(`${API}/api/users/me/saved?lang=${language}`, { credentials: "include" }).then((r) => r.json()),
    ])
      .then(([mine, saved]) => {
        setMyRecipes(Array.isArray(mine) ? mine : []);
        setSavedRecipes(Array.isArray(saved) ? saved : []);
      })
      .catch(() => {})
      .finally(() => setFetching(false));
  }, [user, language]);

  async function handleDelete(slug, title) {
    if (!window.confirm(`Supprimer "${title}" ? Cette action est irréversible.`)) return;
    setDeleting((prev) => new Set(prev).add(slug));
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/recipes/${slug}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) setMyRecipes((prev) => prev.filter((r) => r.slug !== slug));
    } finally {
      setDeleting((prev) => { const n = new Set(prev); n.delete(slug); return n; });
    }
  }

  async function handleUnsave(slug) {
    await fetch(`${import.meta.env.VITE_API_URL}/api/recipes/${slug}/save`, {
      method: "DELETE",
      credentials: "include",
    });
    setSavedRecipes((prev) => prev.filter((r) => r.slug !== slug));
  }

  if (loading || !user) return null;

  const API = import.meta.env.VITE_API_URL;
  const recipes = tab === "mine" ? myRecipes : savedRecipes;

  return (
    <div className="my-recipes-page">
      <div className="my-recipes-header">
        <button className="my-recipes-back" onClick={() => navigate("/")}>← Retour</button>
        <h1>Mon espace</h1>
      </div>

      <div className="my-recipes-tabs">
        <button className={`tab-btn ${tab === "mine" ? "active" : ""}`} onClick={() => setTab("mine")}>
          Mes recettes ({myRecipes.length})
        </button>
        <button className={`tab-btn ${tab === "saved" ? "active" : ""}`} onClick={() => setTab("saved")}>
          Sauvegardées ({savedRecipes.length})
        </button>
      </div>

      {fetching ? (
        <div className="my-recipes-empty"><p>Chargement…</p></div>
      ) : recipes.length === 0 ? (
        <div className="my-recipes-empty">
          {tab === "mine" ? (
            <>
              <p>Vous n'avez pas encore de recette.</p>
              <button className="my-recipes-add" onClick={() => navigate("/add-recipe")}>
                + Ajouter une recette
              </button>
            </>
          ) : (
            <p>Aucune recette sauvegardée.</p>
          )}
        </div>
      ) : (
        <div className="recipes-grid">
          {recipes.map((recipe) => (
            <div key={recipe.slug} className="recipe-preview-card">
              <div className="recipe-image" onClick={() => navigate(`/recipe/${recipe.slug}`)} style={{ cursor: "pointer" }}>
                {recipe.image
                  ? <img src={`${API}${recipe.image}`} alt={recipe.title} className="recipe-image-img" loading="lazy" />
                  : <div className="recipe-image-fallback">🍽️</div>
                }
              </div>
              <div className="recipe-preview-content" onClick={() => navigate(`/recipe/${recipe.slug}`)} style={{ cursor: "pointer" }}>
                <h3>{recipe.title}</h3>
                <p className="recipe-description">{recipe.description}</p>
                {tab === "mine" && (
                  <span className={`my-recipe-badge ${recipe.isPublic ? "public" : "private"}`}>
                    {recipe.isPublic ? "Public" : "Privé"}
                  </span>
                )}
              </div>
              <div className="my-recipe-actions">
                {tab === "mine" ? (
                  <button
                    className="btn-delete"
                    disabled={deleting.has(recipe.slug)}
                    onClick={() => handleDelete(recipe.slug, recipe.title)}
                  >
                    {deleting.has(recipe.slug) ? "Suppression…" : "🗑 Supprimer"}
                  </button>
                ) : (
                  <button className="btn-unsave" onClick={() => handleUnsave(recipe.slug)}>
                    ♥ Retirer
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MyRecipes;
