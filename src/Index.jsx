import React, { useState, useEffect } from 'react';
import './Index.css';
import HomePage from './components/HomePage/HomePage';
import RecipeCard from './components/RecipeCard/RecipeCard';
import SettingsMenu from './components/SettingsMenu/SettingsMenu';

function Index() {
  const [view, setView] = useState('home'); // 'home', 'recipe'
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [recipes, setRecipes] = useState([]);

  // Load all recipes on mount
  useEffect(() => {
    const loadRecipes = async () => {
      try {
        const recipeModules = import.meta.glob('../recipes/**/*.json', { as: 'raw' });
        const imageModules = import.meta.glob('../recipes/**/*.png', { eager: true, import: 'default' });
        const loadedRecipes = [];

        for (const path in recipeModules) {
          const content = await recipeModules[path]();
          const recipe = JSON.parse(content);
          
          const pathParts = path.split('/');
          const recipeName = pathParts[pathParts.length - 2];
          const imagePath = path.replace('.json', '.png');
          const recipeImage = imageModules[imagePath] || null;
          
          loadedRecipes.push({
            ...recipe,
            id: recipeName,
            imagePath: recipeImage
          });
        }

        setRecipes(loadedRecipes);

        // Check URL path after recipes are loaded
        // Also check sessionStorage for GitHub Pages redirect
        const storedPath = sessionStorage.getItem('redirect');
        if (storedPath) {
          sessionStorage.removeItem('redirect');
        }
        
        const path = storedPath || window.location.pathname;
        if (path.startsWith('/recipe/') && path !== '/recipe/' && path !== '/recipe') {
          const recipeId = path.substring(8).replace(/\/$/, ''); // Remove '/recipe/' and trailing slash
          const recipe = loadedRecipes.find(r => r.id === recipeId);
          if (recipe) {
            setSelectedRecipe(recipe);
            setView('recipe');
            // Update URL without page reload
            window.history.replaceState({ view: 'recipe', recipe: recipe }, '', path);
          }
        }
      } catch (error) {
        console.error('Error loading recipes:', error);
      }
    };

    loadRecipes();
  }, []);

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

    // Set initial state if not already set
    if (!window.history.state) {
      const currentView = view === 'recipe' ? 'recipe' : 'home';
      window.history.replaceState(
        { view: currentView, recipe: selectedRecipe }, 
        '', 
        window.location.href
      );
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [view, selectedRecipe]);

  const handleSelectRecipe = (recipe) => {
    setSelectedRecipe(recipe);
    setView('recipe');
    // Add to browser history
    window.history.pushState(
      { view: 'recipe', recipe: recipe },
      '',
      `/recipe/${recipe.id}`
    );
  };

  const handleBackToHome = () => {
    setView('home');
    setSelectedRecipe(null);
    // Update URL to home
    window.history.pushState({ view: 'home' }, '', '/recipe/');
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
