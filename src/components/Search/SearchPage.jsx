import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../contexts/LanguageContext";
import "./SearchPage.css";

function SearchPage() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const inputRef = useRef();

  const [query, setQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (!q) { setUsers([]); setRecipes([]); return; }

    const API = import.meta.env.VITE_API_URL;
    setLoading(true);

    const normalize = (s) =>
      s?.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "") ?? "";
    const nq = normalize(q);

    Promise.all([
      fetch(`${API}/api/users?q=${encodeURIComponent(q)}`).then((r) => r.json()),
      fetch(`${API}/api/recipes?lang=${language}`).then((r) => r.json()),
    ])
      .then(([u, r]) => {
        setUsers(Array.isArray(u) ? u : []);
        setRecipes(
          Array.isArray(r)
            ? r.filter((rec) => normalize(rec.title).includes(nq) || normalize(rec.description).includes(nq))
            : []
        );
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [query, language]);

  const API = import.meta.env.VITE_API_URL;

  return (
    <div className="search-page">
      <div className="search-bar-wrap">
        <div className="search-input-row">
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            className="search-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Chercher une recette ou un utilisateur…"
          />
          {query && (
            <button className="search-clear" onClick={() => setQuery("")}>✕</button>
          )}
        </div>
      </div>

      {loading && <p className="search-loading">Recherche…</p>}

      {!loading && query && users.length === 0 && recipes.length === 0 && (
        <p className="search-empty">Aucun résultat pour « {query} »</p>
      )}

      {!query && (
        <div className="search-placeholder">
          <span>🔍</span>
          <p>Recherchez des recettes ou des utilisateurs</p>
        </div>
      )}

      {users.length > 0 && (
        <section className="search-section">
          <h2>Utilisateurs</h2>
          <div className="search-users">
            {users.map((u) => (
              <div key={u.id} className="search-user-row" onClick={() => navigate(`/profile/${u.id}`)}>
                <div className="search-user-avatar">
                  {u.avatarUrl
                    ? <img src={`${API}${u.avatarUrl}`} alt={u.name} />
                    : <span>{(u.name || "?")[0].toUpperCase()}</span>
                  }
                </div>
                <span className="search-user-name">{u.name || "Utilisateur"}</span>
                <svg className="search-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            ))}
          </div>
        </section>
      )}

      {recipes.length > 0 && (
        <section className="search-section">
          <h2>Recettes ({recipes.length})</h2>
          <div className="search-recipes">
            {recipes.map((r) => (
              <div key={r.slug} className="search-recipe-row" onClick={() => navigate(`/recipe/${r.slug}`)}>
                <div className="search-recipe-thumb">
                  {r.image
                    ? <img src={`${API}${r.image}`} alt={r.title} />
                    : <span>🍽️</span>
                  }
                </div>
                <div className="search-recipe-info">
                  <span className="search-recipe-title">{r.title}</span>
                  <span className="search-recipe-cat">{r.category?.label}</span>
                </div>
                <svg className="search-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default SearchPage;
