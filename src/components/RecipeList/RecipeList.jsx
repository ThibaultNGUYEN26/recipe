import React, { useEffect, useState } from "react";
import DietaryTags from "../DietaryTags/DietaryTags";
import { useLanguage } from "../../contexts/LanguageContext";
import "./RecipeList.css";

function RecipeList({ category, categoryInfo, onSelectRecipe, onBack }) {
  const { language } = useLanguage();
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecipes = async () => {
      try {
        setLoading(true);

        const params = new URLSearchParams({
          lang: language,
          ...(category && { category }),
        });

        const res = await fetch(
          `http://localhost:4000/api/recipes?${params}`
        );
        const data = await res.json();

        setRecipes(data);
      } catch (error) {
        console.error("Error fetching recipes:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecipes();
  }, [category, language]);

  return (
    <div className="recipe-list-container">
      {/* Header */}
      <div className="recipe-list-header">
        <button className="back-button" onClick={onBack}>
          ← Retour aux catégories
        </button>

        <h1>
          {categoryInfo?.emoji ?? "🍴"} {categoryInfo?.label ?? category}
        </h1>

        <p className="recipe-count">
          {recipes.length} recette{recipes.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Content */}
      {loading ? (
        <div className="no-recipes">
          <p>Chargement des recettes…</p>
        </div>
      ) : recipes.length === 0 ? (
        <div className="no-recipes">
          <p>Aucune recette dans cette catégorie pour le moment.</p>
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
                    src={`http://localhost:4000${recipe.image}`}
                    alt={recipe.title}
                    className="recipe-image-img"
                  />
                ) : (
                  <span>🍽️</span>
                )}
                <DietaryTags tags={[]} />
              </div>

              <div className="recipe-preview-content">
                <h3>{recipe.title}</h3>
                <p className="recipe-description">
                  {recipe.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default RecipeList;
