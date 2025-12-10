import React, { useState } from 'react';
import './Index.css';
import HomePage from './components/HomePage';
import RecipeCard from './components/RecipeCard';

function Index() {
  const [view, setView] = useState('home'); // 'home', 'recipe'
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  const handleSelectRecipe = (recipe) => {
    setSelectedRecipe(recipe);
    setView('recipe');
  };

  const handleBackToHome = () => {
    setView('home');
    setSelectedRecipe(null);
  };

  return (
    <div className="recipe-container">
      {view === 'home' && (
        <HomePage onSelectRecipe={handleSelectRecipe} />
      )}
      
      {view === 'recipe' && (
        <RecipeCard
          recipe={selectedRecipe}
          onBack={handleBackToHome}
        />
      )}
    </div>
  );
}

export default Index;
