import React, { useState, useEffect } from 'react';
import './RecipeList.css';

function RecipeList({ category, onSelectRecipe, onBack }) {
  const [recipes, setRecipes] = useState([]);

  useEffect(() => {
    // Load all recipes from the category
    loadRecipes(category);
  }, [category]);

  const loadRecipes = async (categoryName) => {
    try {
      // Dynamically import all .json recipe files
      const recipeModules = import.meta.glob('../recipes/**/*.json', { as: 'raw' });
      const loadedRecipes = [];

      for (const path in recipeModules) {
        const content = await recipeModules[path]();
        const recipe = JSON.parse(content);
        
        if (recipe.category === categoryName) {
          loadedRecipes.push({
            ...recipe,
            id: path.split('/').pop().replace('.json', '')
          });
        }
      }

      setRecipes(loadedRecipes);
    } catch (error) {
      console.error('Error loading recipes:', error);
    }
  };

  const getCategoryInfo = (categoryId) => {
    const categories = {
      'cakes': { name: 'Gâteaux & Desserts', emoji: '🍰' },
      'main-dishes': { name: 'Plats Principaux', emoji: '🍝' },
      'appetizers': { name: 'Entrées', emoji: '🥗' },
      'drinks': { name: 'Boissons', emoji: '🍹' },
      'breakfast': { name: 'Petit-déjeuner', emoji: '🥞' },
      'snacks': { name: 'En-cas', emoji: '🍿' }
    };
    return categories[categoryId] || { name: categoryId, emoji: '🍴' };
  };

  const categoryInfo = getCategoryInfo(category);

  return (
    <div className="recipe-list-container">
      <div className="recipe-list-header">
        <button className="back-button" onClick={onBack}>
          ← Retour aux catégories
        </button>
        <h1>{categoryInfo.emoji} {categoryInfo.name}</h1>
        <p className="recipe-count">{recipes.length} recette{recipes.length !== 1 ? 's' : ''}</p>
      </div>

      {recipes.length === 0 ? (
        <div className="no-recipes">
          <p>Aucune recette dans cette catégorie pour le moment !</p>
          <p className="hint">Ajoutez un fichier .json dans le dossier src/recipes/{category}</p>
        </div>
      ) : (
        <div className="recipes-grid">
          {recipes.map(recipe => (
            <div
              key={recipe.id}
              className="recipe-preview-card"
              onClick={() => onSelectRecipe(recipe)}
            >
              <div className="recipe-image">{recipe.image || '🍽️'}</div>
              <div className="recipe-preview-content">
                <h3>{recipe.name}</h3>
                <p className="recipe-description">{recipe.description}</p>
                <div className="recipe-meta">
                  <span>⏱️ {recipe.info.totalTime}</span>
                  <span>👥 {recipe.info.servings}</span>
                  <span>📊 {recipe.info.difficulty}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default RecipeList;
