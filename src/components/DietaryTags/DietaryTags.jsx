import React from 'react';
import './DietaryTags.css';

function DietaryTags({ tags }) {
  if (!tags || tags.length === 0) {
    return null;
  }

  const tagConfig = {
    vegetarian: { emoji: '🥬', label: 'Vegetarian', color: '#4CAF50' },
    vegan: { emoji: '🌱', label: 'Vegan', color: '#8BC34A' },
    halal: { emoji: '☪️', label: 'Halal', color: '#2196F3' },
    kosher: { emoji: '✡️', label: 'Kosher', color: '#3F51B5' },
    'gluten-free': { emoji: '🌾', label: 'Gluten-Free', color: '#FF9800' },
    'dairy-free': { emoji: '🥛', label: 'Dairy-Free', color: '#00BCD4' },
    'nut-free': { emoji: '🥜', label: 'Nut-Free', color: '#795548' },
    pescatarian: { emoji: '🐟', label: 'Pescatarian', color: '#009688' }
  };

  return (
    <div className="dietary-tags">
      {tags.map((tag, index) => {
        const config = tagConfig[tag.toLowerCase()];
        if (!config) return null;

        return (
          <div
            key={index}
            className="dietary-tag"
            style={{ backgroundColor: config.color }}
            title={config.label}
          >
            <span className="tag-emoji">{config.emoji}</span>
            <span className="tag-label">{config.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export default DietaryTags;
