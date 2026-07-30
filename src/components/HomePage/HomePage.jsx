import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DietaryTags from "../DietaryTags/DietaryTags";
import { useLanguage } from "../../contexts/LanguageContext";
import "./HomePage.css";

function HomePage({ onSelectRecipe }) {
  const { language } = useLanguage();
  const navigate = useNavigate();

  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecipes = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/api/recipes?lang=${language}`
        );
        const data = await res.json();
        setRecipes(data);
      } catch (err) {
        console.error("Error fetching recipes:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecipes();
  }, [language]);

  return (
    <div className="home-page-container">
      <h1 className="feed-title">Recipes</h1>
      {loading ? (
        <div className="no-recipes">
          <p>Chargement des recettes…</p>
        </div>
      ) : recipes.length === 0 ? (
        <div className="no-recipes">
          <p>Aucune recette trouvée.</p>
        </div>
      ) : (
        <div className="recipes-grid">
          {recipes.map((recipe) => (
            <div
              key={recipe.slug}
              className="recipe-preview-card"
              onClick={() => onSelectRecipe(recipe.slug)}
            >
              <div className="recipe-image">
                {recipe.image ? (
                  <img
                    src={`${import.meta.env.VITE_API_URL}${recipe.image}`}
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

                {recipe.authorId && (
                  <div
                    className="recipe-author-row"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/profile/${recipe.authorId}`);
                    }}
                  >
                    <div className="recipe-author-avatar">
                      {recipe.authorAvatar
                        ? <img src={`${import.meta.env.VITE_API_URL}${recipe.authorAvatar}`} alt={recipe.authorName} />
                        : <span>{(recipe.authorName || '?')[0].toUpperCase()}</span>
                      }
                    </div>
                    <span className="recipe-author-name">{recipe.authorName}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default HomePage;
