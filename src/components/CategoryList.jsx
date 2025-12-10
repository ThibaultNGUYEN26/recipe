import React from 'react';
import './CategoryList.css';

function CategoryList({ onSelectCategory }) {
  const categories = [
    { id: 'cakes', name: 'Gâteaux & Desserts', emoji: '🍰', color: '#ff9a9e' },
    { id: 'main-dishes', name: 'Plats Principaux', emoji: '🍝', color: '#feca57' },
    { id: 'appetizers', name: 'Entrées', emoji: '🥗', color: '#48dbfb' },
    { id: 'drinks', name: 'Boissons', emoji: '🍹', color: '#ff6b6b' },
    { id: 'breakfast', name: 'Petit-déjeuner', emoji: '🥞', color: '#ffeaa7' },
    { id: 'snacks', name: 'En-cas', emoji: '🍿', color: '#a29bfe' }
  ];

  return (
    <div className="category-list-container">
      <div className="header">
        <h1>🍳 Mon Carnet de Recettes 🍰</h1>
        <p className="subtitle">Choisissez une catégorie pour explorer de délicieuses recettes</p>
      </div>
      
      <div className="categories-grid">
        {categories.map(category => (
          <div
            key={category.id}
            className="category-card"
            style={{ '--card-color': category.color }}
            onClick={() => onSelectCategory(category.id)}
          >
            <div className="category-emoji">{category.emoji}</div>
            <h3 className="category-name">{category.name}</h3>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CategoryList;
