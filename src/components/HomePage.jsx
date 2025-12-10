import React, { useState, useEffect, useRef } from 'react';
import './HomePage.css';

function HomePage({ onSelectRecipe, onSelectCategory }) {
  const [recipes, setRecipes] = useState([]);
  const [filteredRecipes, setFilteredRecipes] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const carouselRef = useRef(null);

  const categories = [
    { id: 'all', name: 'Toutes', emoji: '🍽️', color: '#667eea' },
    { id: 'cakes', name: 'Gâteaux & Desserts', emoji: '🍰', color: '#ff9a9e' },
    { id: 'main-dishes', name: 'Plats Principaux', emoji: '🍝', color: '#feca57' },
    { id: 'appetizers', name: 'Entrées', emoji: '🥗', color: '#48dbfb' },
    { id: 'drinks', name: 'Boissons', emoji: '🍹', color: '#ff6b6b' },
    { id: 'breakfast', name: 'Petit-déjeuner', emoji: '🥞', color: '#ffeaa7' },
    { id: 'snacks', name: 'En-cas', emoji: '🍿', color: '#a29bfe' }
  ];

  useEffect(() => {
    loadAllRecipes();
  }, []);

  useEffect(() => {
    if (activeCategory === 'all') {
      setFilteredRecipes(recipes);
    } else {
      setFilteredRecipes(recipes.filter(recipe => recipe.category === activeCategory));
    }
  }, [activeCategory, recipes]);

  const loadAllRecipes = async () => {
    try {
      const recipeModules = import.meta.glob('../recipes/**/*.json', { as: 'raw' });
      const loadedRecipes = [];

      for (const path in recipeModules) {
        const content = await recipeModules[path]();
        const recipe = JSON.parse(content);
        
        loadedRecipes.push({
          ...recipe,
          id: path.split('/').pop().replace('.json', '')
        });
      }

      setRecipes(loadedRecipes);
      setFilteredRecipes(loadedRecipes);
    } catch (error) {
      console.error('Error loading recipes:', error);
    }
  };

  const handleCategoryClick = (categoryId) => {
    setActiveCategory(categoryId);
  };

  const scrollCarousel = (direction) => {
    if (carouselRef.current) {
      const scrollAmount = 300;
      carouselRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="home-page-container">
      <div className="header">
        <h1>🍳 Mon Carnet de Recettes 🍰</h1>
        <p className="subtitle">Découvrez toutes mes recettes favorites</p>
      </div>

      {/* Category Carousel */}
      <div className="carousel-section">
        <button className="carousel-btn left" onClick={() => scrollCarousel('left')}>
          ‹
        </button>
        <div className="categories-carousel" ref={carouselRef}>
          {categories.map(category => (
            <div
              key={category.id}
              className={`category-card ${activeCategory === category.id ? 'active' : ''}`}
              style={{ '--card-color': category.color }}
              onClick={() => handleCategoryClick(category.id)}
            >
              <div className="category-emoji">{category.emoji}</div>
              <h3 className="category-name">{category.name}</h3>
            </div>
          ))}
        </div>
        <button className="carousel-btn right" onClick={() => scrollCarousel('right')}>
          ›
        </button>
      </div>

      {/* All Recipes Grid */}
      <div className="all-recipes-section">
        <h2>
          {activeCategory === 'all' 
            ? `Toutes les recettes (${filteredRecipes.length})` 
            : `${categories.find(c => c.id === activeCategory)?.name} (${filteredRecipes.length})`}
        </h2>

        {filteredRecipes.length === 0 ? (
          <div className="no-recipes">
            <p>Aucune recette disponible pour le moment !</p>
            <p className="hint">Ajoutez des fichiers .json dans src/recipes/</p>
          </div>
        ) : (
          <div className="recipes-grid">
            {filteredRecipes.map(recipe => (
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
    </div>
  );
}

export default HomePage;
