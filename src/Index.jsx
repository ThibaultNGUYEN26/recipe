import React from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import "./Index.css";

import HomePage from "./components/HomePage/HomePage";
import PrivacyPolicy from "./components/PrivacyPolicy/PrivacyPolicy";
import Footer from "./components/Footer/Footer";
import RecipeDetail from "./components/RecipeDetail/RecipeDetail";
import Login from "./components/Auth/Login";
import Register from "./components/Auth/Register";
import AddRecipe from "./components/AddRecipe/AddRecipe";
import MyRecipes from "./components/MyRecipes/MyRecipes";
import ProfilePage from "./components/Profile/ProfilePage";
import EditProfile from "./components/Profile/EditProfile";
import SearchPage from "./components/Search/SearchPage";
import BottomNav from "./components/BottomNav/BottomNav";


// ---------------- Home Wrapper ----------------
function HomePageWrapper() {
  const navigate = useNavigate();
  return (
    <div className="recipe-container">
      <HomePage onSelectRecipe={(slug) => navigate(`/recipe/${slug}`)} />
    </div>
  );
}

// ---------------- App ----------------
export default function Index() {
  return (
    <>
      <Routes>
        <Route path="/" element={<HomePageWrapper />} />
        <Route path="/recipe/:slug" element={<RecipeDetail />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/add-recipe" element={<AddRecipe />} />
        <Route path="/my-recipes" element={<MyRecipes />} />
        <Route path="/profile/:userId" element={<ProfilePage />} />
        <Route path="/settings/profile" element={<EditProfile />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      </Routes>

      <BottomNav />
      <Footer />
    </>
  );
}
