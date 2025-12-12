import React, { useState, useEffect } from 'react';
import './Index.css';
import HomePage from './components/HomePage/HomePage';
import RecipeCard from './components/RecipeCard/RecipeCard';
import SettingsMenu from './components/SettingsMenu/SettingsMenu';

function Index() {
  const [view, setView] = useState('home'); // 'home', 'recipe'
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  useEffect(() => {
    // Handle browser back/forward buttons
    const handlePopState = (event) => {
      if (event.state && event.state.view === 'recipe' && event.state.recipe) {
        setView('recipe');
        setSelectedRecipe(event.state.recipe);
      } else {
        setView('home');
        setSelectedRecipe(null);
      }
    };

    window.addEventListener('popstate', handlePopState);

    // Set initial state
    if (!window.history.state) {
      window.history.replaceState({ view: 'home' }, '', window.location.pathname);
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const handleSelectRecipe = (recipe) => {
    setSelectedRecipe(recipe);
    setView('recipe');
    // Add to browser history
    window.history.pushState(
      { view: 'recipe', recipe: recipe },
      '',
      `${window.location.pathname}#recipe-${recipe.id}`
    );
  };

  const handleBackToHome = () => {
    setView('home');
    setSelectedRecipe(null);
    // Go back in browser history
    window.history.back();
  };

  return (
    <div className="recipe-container">
      {view === 'home' && <SettingsMenu />}
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
