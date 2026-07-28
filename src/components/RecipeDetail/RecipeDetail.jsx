import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLanguage } from "../../contexts/LanguageContext";
import { useAuth } from "../../contexts/AuthContext";
import RecipeCard from "../RecipeCard/RecipeCard";
import StarRating from "../Rating/StarRating";
import "./RecipeDetail.css";

function SaveButton({ slug, initialSaved }) {
  const [saved, setSaved] = useState(initialSaved);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  async function toggle() {
    if (!user) return navigate("/login");
    setLoading(true);
    const method = saved ? "DELETE" : "POST";
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/recipes/${slug}/save`, {
        method,
        credentials: "include",
      });
      if (res.ok) setSaved(!saved);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button className={`save-btn ${saved ? "saved" : ""}`} onClick={toggle} disabled={loading}>
      {saved ? "♥ Sauvegardée" : "♡ Sauvegarder"}
    </button>
  );
}

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
          `${import.meta.env.VITE_API_URL}/api/recipes/${slug}?lang=${language}`
        );

        if (!res.ok) { setRecipe(null); return; }

        const data = await res.json();

        const adaptedRecipe = {
          ...data,
          name: data.title,
          imagePath: data.image ? `${import.meta.env.VITE_API_URL}${data.image}` : null,
          info: {
            prepTime: data.info?.prepTime ?? "—",
            cookTime: data.info?.cookTime ?? "—",
            totalTime: data.info?.totalTime ?? "—",
            servings: data.info?.servings ?? 1,
            difficulty: data.info?.difficulty ?? "—",
          },
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

  if (loading) return <div className="recipe-container">Chargement…</div>;

  if (!recipe) {
    return (
      <div className="recipe-container">
        <p>Recette introuvable.</p>
        <button onClick={() => navigate("/")}>← Retour</button>
      </div>
    );
  }

  return (
    <>
      <RecipeCard recipe={recipe} onBack={() => navigate("/")} />
      <div className="recipe-social-bar">
        <StarRating
          slug={slug}
          avgRating={recipe.avgRating}
          ratingCount={recipe.ratingCount}
          myRating={recipe.myRating}
        />
        <SaveButton slug={slug} initialSaved={recipe.isSaved} />
        {recipe.authorId && (
          <button className="recipe-author-btn" onClick={() => navigate(`/profile/${recipe.authorId}`)}>
            Voir le profil →
          </button>
        )}
      </div>
    </>
  );
}

export default RecipeDetail;
