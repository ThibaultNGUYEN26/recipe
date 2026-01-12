import React, { useEffect, useRef, useState } from "react";
import SearchBar from "../SearchBar/SearchBar";
import DietaryTags from "../DietaryTags/DietaryTags";
import { useLanguage } from "../../contexts/LanguageContext";
import { getTranslation } from "../../translations/translations";
import "./HomePage.css";

function HomePage({ onSelectRecipe }) {
  const { language } = useLanguage();
  const carouselRef = useRef(null);

  const [recipes, setRecipes] = useState([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const categories = [
    { id: "all", name: language === "fr" ? "Toutes" : "All", emoji: "🍽️", color: "#667eea" },
    { id: "cakes", name: "Gâteaux & Desserts", emoji: "🍰", color: "#ff9a9e" },
    { id: "main-dishes", name: "Plats principaux", emoji: "🍝", color: "#feca57" },
    { id: "appetizers", name: "Entrées", emoji: "🥗", color: "#48dbfb" },
    { id: "drinks", name: "Boissons", emoji: "🍹", color: "#ff6b6b" },
    { id: "breakfast", name: "Petit-déjeuner", emoji: "🥞", color: "#ffeaa7" },
    { id: "snacks", name: "En-cas", emoji: "🍿", color: "#a29bfe" },
  ];

  /* ---------------- FETCH FROM BACKEND ---------------- */

  useEffect(() => {
    fetchRecipes();
  }, [language, activeCategory]);

  const fetchRecipes = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        lang: language,
        ...(activeCategory !== "all" && { category: activeCategory }),
      });

      const res = await fetch(
        `http://localhost:4000/api/recipes?${params}`
      );
      const data = await res.json();

      setRecipes(data);
    } catch (err) {
      console.error("Error fetching recipes:", err);
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- SEARCH (client-side only) ---------------- */

  const normalize = (str) =>
    str
      ?.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const filteredRecipes = recipes.filter((r) => {
    if (!searchQuery) return true;

    const q = normalize(searchQuery);
    return (
      normalize(r.title)?.includes(q) ||
      normalize(r.description)?.includes(q) ||
      r.tags?.some((t) => normalize(t).includes(q))
    );
  });

  /* ---------------- UI HELPERS ---------------- */

  const scrollCarousel = (dir) => {
    carouselRef.current?.scrollBy({
      left: dir === "left" ? -300 : 300,
      behavior: "smooth",
    });
  };

  /* ---------------- RENDER ---------------- */

  return (
    <div className="home-page-container">
      <div className="header">
        <h1>{getTranslation(language, "title")}</h1>
        <SearchBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      </div>

      {/* -------- CATEGORY CAROUSEL -------- */}
      <div className="carousel-section">
        <button className="carousel-btn left" onClick={() => scrollCarousel("left")}>
          ‹
        </button>

        <div className="categories-carousel" ref={carouselRef}>
          {categories.map((cat) => (
            <div
              key={cat.id}
              className={`category-card ${activeCategory === cat.id ? "active" : ""}`}
              style={{ "--card-color": cat.color }}
              onClick={() => setActiveCategory(cat.id)}
            >
              <div className="category-emoji">{cat.emoji}</div>
              <h3 className="category-name">{cat.name}</h3>
            </div>
          ))}
        </div>

        <button className="carousel-btn right" onClick={() => scrollCarousel("right")}>
          ›
        </button>
      </div>

      {/* -------- RECIPES GRID -------- */}
      <div className="all-recipes-section">
        <h2>
          {activeCategory === "all"
            ? `Toutes les recettes (${filteredRecipes.length})`
            : `${categories.find((c) => c.id === activeCategory)?.name} (${filteredRecipes.length})`}
        </h2>

        {loading ? (
          <div className="no-recipes">
            <p>Chargement des recettes…</p>
          </div>
        ) : filteredRecipes.length === 0 ? (
          <div className="no-recipes">
            <p>Aucune recette trouvée.</p>
          </div>
        ) : (
          <div className="recipes-grid">
            {filteredRecipes.map((recipe) => (
              <div
                key={recipe.slug}
                className="recipe-preview-card"
                onClick={() => onSelectRecipe(recipe.slug)}
              >
                <div className="recipe-image">
                  {recipe.image ? (
                    <img
                      src={`http://localhost:4000${recipe.image}`}
                      alt={recipe.title}
                      className="recipe-image-img"
                      loading="lazy"
                    />
                  ) : (
                    <div className="recipe-image-fallback">🍽️</div>
                  )}

                  <div className="recipe-image-overlay">
                    <DietaryTags tags={recipe.dietaryTags || []} />
                  </div>
                </div>


                <div className="recipe-preview-content">
                  <h3>{recipe.title}</h3>
                  <p className="recipe-description">{recipe.description}</p>

                  {recipe.info && (
                    <div className="recipe-meta">
                      <span>⏱️ {recipe.info.totalTime}</span>
                      <span>👥 {recipe.info.servings}</span>
                      <span>📊 {recipe.info.difficulty}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default HomePage;
