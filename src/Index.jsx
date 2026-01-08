import React from "react";
import { Routes, Route, useParams, useNavigate } from "react-router-dom";
import "./Index.css";

import HomePage from "./components/HomePage/HomePage";
import RecipeCard from "./components/RecipeCard/RecipeCard";
import SettingsMenu from "./components/SettingsMenu/SettingsMenu";
import PrivacyPolicy from "./components/PrivacyPolicy/PrivacyPolicy";
import Footer from "./components/Footer/Footer";
import { useLanguage } from "./contexts/LanguageContext";

// ---------------- Recipe Page ----------------
function RecipePage() {
  const { recipeId } = useParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [recipe, setRecipe] = React.useState(null);

  React.useEffect(() => {
    const loadRecipe = async () => {
      const recipeModules = import.meta.glob("./recipes/**/*.json", { as: "raw" });
      const imageModules = import.meta.glob("./recipes/**/*.png", { eager: true, import: "default" });

      for (const path in recipeModules) {
        const recipeName = path.split("/").slice(-2)[0];
        if (recipeName !== recipeId) continue;

        const fileName = path.split("/").pop();
        const expected = `.${language}.json`;
        if (fileName.includes(".fr.json") || fileName.includes(".en.json")) {
          if (!fileName.endsWith(expected)) continue;
        }

        const content = await recipeModules[path]();
        const data = JSON.parse(content);
        const imagePath = path.replace(/\.(fr|en)?\.json$/, ".png");

        setRecipe({
          ...data,
          id: recipeName,
          imagePath: imageModules[imagePath] || null
        });
        return;
      }

      navigate("/");
    };

    loadRecipe();
  }, [recipeId, language, navigate]);

  if (!recipe) return <div className="recipe-container">Loading...</div>;

  return (
    <div className="recipe-container">
      <RecipeCard recipe={recipe} onBack={() => navigate("/")} />
    </div>
  );
}

// ---------------- Home Wrapper ----------------
function HomePageWrapper() {
  const navigate = useNavigate();

  return (
    <div className="recipe-container">
      <SettingsMenu />
      <HomePage onSelectRecipe={(r) => navigate(`/${r.id}`)} />
    </div>
  );
}

// ---------------- App ----------------
export default function Index() {
  return (
    <>
      <Routes>
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/" element={<HomePageWrapper />} />
        <Route path="/:recipeId" element={<RecipePage />} />
      </Routes>

      {/* MUST be outside Routes */}
      <Footer />
    </>
  );
}
