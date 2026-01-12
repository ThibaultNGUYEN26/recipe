import React from "react";
import { Routes, Route, useParams, useNavigate } from "react-router-dom";
import "./Index.css";

import HomePage from "./components/HomePage/HomePage";
import RecipeCard from "./components/RecipeCard/RecipeCard";
import SettingsMenu from "./components/SettingsMenu/SettingsMenu";
import PrivacyPolicy from "./components/PrivacyPolicy/PrivacyPolicy";
import Footer from "./components/Footer/Footer";
import { useLanguage } from "./contexts/LanguageContext";
import RecipeDetail from "./components/RecipeDetail/RecipeDetail";


// ---------------- Home Wrapper ----------------
function HomePageWrapper() {
  const navigate = useNavigate();

  return (
    <div className="recipe-container">
      <SettingsMenu />
      <HomePage onSelectRecipe={(slug) => navigate(`/recipe/${slug}`)} />
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
        <Route path="/recipe/:slug" element={<RecipeDetail />} />
      </Routes>

      {/* MUST be outside Routes */}
      <Footer />
    </>
  );
}
