import React, { useState } from 'react';
import './RecipeCard.css';

function RecipeCard({ recipe, onBack }) {
  const [servings, setServings] = useState(recipe.info.servings);
  const multiplier = servings / recipe.info.servings;

  const adjustQuantity = (text) => {
    // Match numbers (including decimals and fractions) followed by units
    return text.replace(/(\d+(?:[.,]\d+)?(?:\/\d+)?)\s*(g|kg|ml|l|cl|c\.|cuillères?|tasses?|cups?)?/gi, (match, number, unit) => {
      // Convert fraction to decimal if present
      let value = number;
      if (number.includes('/')) {
        const [num, den] = number.split('/');
        value = parseFloat(num) / parseFloat(den);
      } else {
        value = parseFloat(number.replace(',', '.'));
      }
      
      // Calculate new value
      const newValue = value * multiplier;
      
      // Format the result
      let formatted;
      if (newValue % 1 === 0) {
        formatted = Math.round(newValue);
      } else {
        formatted = newValue.toFixed(1).replace('.0', '');
      }
      
      return unit ? `${formatted} ${unit}` : `${formatted}`;
    });
  };

  const handleServingsChange = (delta) => {
    const newServings = Math.max(1, servings + delta);
    setServings(newServings);
  };

  return (
    <div className="recipe-card-container">
      <div className="recipe-header">
        <button className="back-button" onClick={onBack}>
          ← Retour à l'accueil
        </button>
        <div className="recipe-title-section">
          <div className="recipe-emoji">{recipe.image || '🍽️'}</div>
          <h1>{recipe.name}</h1>
          <p className="recipe-description">{recipe.description}</p>
        </div>
      </div>

      <div className="recipe-content">
        {/* Info Card */}
        <div className="card info-card">
          <h2>📋 Informations</h2>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Préparation</span>
              <span className="info-value">{recipe.info.prepTime}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Cuisson</span>
              <span className="info-value">{recipe.info.cookTime}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Temps Total</span>
              <span className="info-value">{recipe.info.totalTime}</span>
            </div>
            <div className="info-item info-item-portions">
              <span className="info-label">Portions</span>
              <div className="servings-adjuster">
                <button className="adjust-btn" onClick={() => handleServingsChange(-1)}>−</button>
                <span className="servings-number">{servings}</span>
                <button className="adjust-btn" onClick={() => handleServingsChange(1)}>+</button>
              </div>
            </div>
            <div className="info-item">
              <span className="info-label">Difficulté</span>
              <span className="info-value">{recipe.info.difficulty}</span>
            </div>
          </div>
        </div>

        {/* Nutrition Card */}
        <div className="card nutrition-card">
          <h2>🥗 Valeurs Nutritionnelles</h2>
          <p className="per-serving">Par portion</p>
          <div className="nutrition-grid">
            {Object.entries(recipe.nutrition).map(([key, value]) => (
              <div key={key} className="nutrition-item">
                <span className="nutrition-label">
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </span>
                <span className="nutrition-value">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Ingredients Card */}
        <div className="card ingredients-card">
          <h2>🛒 Ingrédients</h2>
          {multiplier !== 1 && (
            <p className="ingredients-note">
              ✨ Quantités ajustées pour {servings} personnes (recette originale : {recipe.info.servings})
            </p>
          )}
          {recipe.ingredients.map((section, index) => (
            <div key={index} className="ingredient-section">
              <h3>{section.section}</h3>
              <ul>
                {section.items.map((item, i) => (
                  <li key={i}>{adjustQuantity(item)}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Instructions Card */}
        <div className="card instructions-card">
          <h2>👨‍🍳 Préparation</h2>
          <div className="instructions-list">
            {recipe.instructions.map((instruction) => (
              <div key={instruction.step} className="instruction-step">
                <div className="step-number">{instruction.step}</div>
                <p className="step-text">{instruction.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tips Card */}
        {recipe.tips && recipe.tips.length > 0 && (
          <div className="card tips-card">
            <h2>💡 Astuces</h2>
            <ul className="tips-list">
              {recipe.tips.map((tip, index) => (
                <li key={index}>{tip}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Tags */}
        {recipe.tags && recipe.tags.length > 0 && (
          <div className="tags-section">
            {recipe.tags.map((tag, index) => (
              <span key={index} className="tag">#{tag}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default RecipeCard;
