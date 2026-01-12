import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLanguage } from "../../contexts/LanguageContext";
import RecipeCard from "../RecipeCard/RecipeCard";

function RecipeDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { language } = useLanguage();

  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecipe = async () => {
      try {
        setLoading(true);

        const res = await fetch(
          `http://localhost:4000/api/recipes/${slug}?lang=${language}`
        );

        if (!res.ok) {
          setRecipe(null);
          return;
        }

        const data = await res.json();

        /**
         * 🔧 ADAPTER LAYER
         * Convert backend recipe → RecipeCard format
         */
        const adaptedRecipe = {
          ...data,

          // RecipeCard expects `name`
          name: data.title,

          // Image
          imagePath: data.image
            ? `http://localhost:4000${data.image}`
            : null,

          // RecipeCard expects info object
          info: {
            prepTime: data.info?.prepTime ?? "—",
            cookTime: data.info?.cookTime ?? "—",
            totalTime: data.info?.totalTime ?? "—",
            servings: data.info?.servings ?? 1,
            difficulty: data.info?.difficulty ?? "—",
          },

          // Defensive defaults (avoid crashes)
          nutrition: data.nutrition ?? {},
          ingredients: data.ingredients ?? [],
          instructions: data.instructions ?? [],
          tips: data.tips ?? [],
          dietaryTags: data.dietaryTags ?? [],
          tags: data.tags ?? [],
        };

        setRecipe(adaptedRecipe);
      } catch (error) {
        console.error("Error fetching recipe:", error);
        setRecipe(null);
      } finally {
        setLoading(false);
      }
    };

    fetchRecipe();
  }, [slug, language]);

  if (loading) {
    return <div className="recipe-container">Chargement…</div>;
  }

  if (!recipe) {
    return (
      <div className="recipe-container">
        <p>Recette introuvable.</p>
        <button onClick={() => navigate("/")}>← Retour</button>
      </div>
    );
  }

  return (
    <RecipeCard
      recipe={recipe}
      onBack={() => navigate("/")}
    />
  );
}

export default RecipeDetail;
