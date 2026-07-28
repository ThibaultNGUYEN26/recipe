import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { useTheme } from "../../contexts/ThemeContext";
import "./Profile.css";

function ProfilePage() {
  const { userId } = useParams();
  const { user: me, logout } = useAuth();
  const { language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  // Recipe tabs (own profile only)
  const [tab, setTab] = useState("mine");
  const [myRecipes, setMyRecipes] = useState([]);
  const [savedRecipes, setSavedRecipes] = useState([]);
  const [recipesLoading, setRecipesLoading] = useState(false);
  const [deleting, setDeleting] = useState(new Set());

  const isOwnProfile = me && me.id === parseInt(userId);
  const API = import.meta.env.VITE_API_URL;

  // Load profile + follow status
  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API}/api/users/${userId}`).then((r) => r.json()),
      me
        ? fetch(`${API}/api/users/${userId}/followers`, { credentials: "include" })
            .then((r) => r.json())
            .then((followers) => Array.isArray(followers) && followers.some((f) => f.id === me.id))
        : Promise.resolve(false),
    ])
      .then(([prof, following]) => { setProfile(prof); setIsFollowing(following); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId, me]);

  // Load recipes
  useEffect(() => {
    if (!profile) return;
    setRecipesLoading(true);

    if (isOwnProfile) {
      Promise.all([
        fetch(`${API}/api/my-recipes?lang=${language}`, { credentials: "include" }).then((r) => r.json()),
        fetch(`${API}/api/users/me/saved?lang=${language}`, { credentials: "include" }).then((r) => r.json()),
      ])
        .then(([mine, saved]) => {
          setMyRecipes(Array.isArray(mine) ? mine : []);
          setSavedRecipes(Array.isArray(saved) ? saved : []);
        })
        .catch(() => {})
        .finally(() => setRecipesLoading(false));
    } else {
      fetch(`${API}/api/users/${userId}/recipes?lang=${language}`)
        .then((r) => r.json())
        .then((recs) => setMyRecipes(Array.isArray(recs) ? recs : []))
        .catch(() => {})
        .finally(() => setRecipesLoading(false));
    }
  }, [profile, language, isOwnProfile, userId]);

  async function toggleFollow() {
    if (!me) return navigate("/login");
    setFollowLoading(true);
    const method = isFollowing ? "DELETE" : "POST";
    try {
      await fetch(`${API}/api/users/${userId}/follow`, { method, credentials: "include" });
      setIsFollowing(!isFollowing);
      setProfile((p) => ({ ...p, followerCount: p.followerCount + (isFollowing ? -1 : 1) }));
    } finally {
      setFollowLoading(false);
    }
  }

  async function handleDelete(slug, title) {
    if (!window.confirm(`Supprimer "${title}" ?`)) return;
    setDeleting((prev) => new Set(prev).add(slug));
    try {
      const res = await fetch(`${API}/api/recipes/${slug}`, { method: "DELETE", credentials: "include" });
      if (res.ok) {
        setMyRecipes((prev) => prev.filter((r) => r.slug !== slug));
        setProfile((p) => ({ ...p, recipeCount: p.recipeCount - 1 }));
      }
    } finally {
      setDeleting((prev) => { const n = new Set(prev); n.delete(slug); return n; });
    }
  }

  async function handleUnsave(slug) {
    await fetch(`${API}/api/recipes/${slug}/save`, { method: "DELETE", credentials: "include" });
    setSavedRecipes((prev) => prev.filter((r) => r.slug !== slug));
  }

  if (loading) return <div className="profile-page"><p className="profile-loading">Chargement…</p></div>;
  if (!profile || profile.error) return <div className="profile-page"><p>Utilisateur introuvable.</p></div>;

  const displayRecipes = isOwnProfile ? (tab === "mine" ? myRecipes : savedRecipes) : myRecipes;

  return (
    <div className="profile-page">
      <button className="profile-back" onClick={() => navigate(-1)}>← Retour</button>

      <div className="profile-card">
        <div className="profile-avatar">
          {profile.avatarUrl
            ? <img src={`${API}${profile.avatarUrl}`} alt={profile.name} />
            : <span className="profile-avatar-placeholder">{(profile.name || "?")[0].toUpperCase()}</span>
          }
        </div>

        <div className="profile-info">
          <h1>{profile.name || "Utilisateur"}</h1>
          {profile.bio && <p className="profile-bio">{profile.bio}</p>}

          <div className="profile-stats">
            <div className="profile-stat">
              <span className="stat-value">{profile.recipeCount}</span>
              <span className="stat-label">recettes</span>
            </div>
            <div className="profile-stat">
              <span className="stat-value">{profile.followerCount}</span>
              <span className="stat-label">abonnés</span>
            </div>
            <div className="profile-stat">
              <span className="stat-value">{profile.followingCount}</span>
              <span className="stat-label">abonnements</span>
            </div>
          </div>

          {!isOwnProfile && (
            <button
              className={`profile-follow-btn ${isFollowing ? "following" : ""}`}
              onClick={toggleFollow}
              disabled={followLoading}
            >
              {isFollowing ? "✓ Abonné" : "+ S'abonner"}
            </button>
          )}

          {isOwnProfile && (
            <button className="profile-edit-btn" onClick={() => navigate("/settings/profile")}>
              Modifier le profil
            </button>
          )}
        </div>
      </div>

      {/* Tabs — own profile only */}
      {isOwnProfile && (
        <div className="profile-tabs">
          <button className={`tab-btn ${tab === "mine" ? "active" : ""}`} onClick={() => setTab("mine")}>
            Mes recettes ({myRecipes.length})
          </button>
          <button className={`tab-btn ${tab === "saved" ? "active" : ""}`} onClick={() => setTab("saved")}>
            Sauvegardées ({savedRecipes.length})
          </button>
        </div>
      )}

      {/* Recipes grid */}
      <div className="profile-recipes-section">
        {!isOwnProfile && <h2>Recettes ({myRecipes.length})</h2>}

        {recipesLoading ? (
          <p className="profile-empty">Chargement…</p>
        ) : displayRecipes.length === 0 ? (
          <p className="profile-empty">
            {isOwnProfile && tab === "mine" ? "Vous n'avez pas encore de recette." :
             isOwnProfile && tab === "saved" ? "Aucune recette sauvegardée." :
             "Aucune recette pour le moment."}
          </p>
        ) : (
          <div className="recipes-grid">
            {displayRecipes.map((recipe) => (
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
                  {isOwnProfile && tab === "mine" && (
                    <span className={`my-recipe-badge ${recipe.isPublic ? "public" : "private"}`}>
                      {recipe.isPublic ? "Public" : "Privé"}
                    </span>
                  )}
                </div>
                {isOwnProfile && (
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
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Settings — own profile only */}
      {isOwnProfile && (
        <div className="profile-settings">
          <h2>Réglages</h2>

          <div className="profile-settings-row">
            <span>{language === "fr" ? "Langue" : "Language"}</span>
            <div className="nav-sheet-toggle">
              <span className={language === "fr" ? "active" : ""}>FR</span>
              <label className="toggle-switch">
                <input type="checkbox" checked={language === "en"}
                  onChange={() => setLanguage(language === "fr" ? "en" : "fr")} />
                <span className="toggle-slider" />
              </label>
              <span className={language === "en" ? "active" : ""}>EN</span>
            </div>
          </div>

          <div className="profile-settings-row">
            <span>{language === "fr" ? "Thème" : "Theme"}</span>
            <div className="nav-sheet-toggle">
              <span className={theme === "light" ? "active" : ""}>☀️</span>
              <label className="toggle-switch">
                <input type="checkbox" checked={theme === "dark"} onChange={toggleTheme} />
                <span className="toggle-slider" />
              </label>
              <span className={theme === "dark" ? "active" : ""}>🌙</span>
            </div>
          </div>

          <button className="profile-settings-row profile-logout" onClick={() => { logout(); navigate("/"); }}>
            <span>{language === "fr" ? "Déconnexion" : "Log out"}</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

export default ProfilePage;
