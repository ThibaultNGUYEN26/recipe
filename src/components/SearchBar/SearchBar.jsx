import React from 'react';
import './SearchBar.css';

function SearchBar({ searchQuery, onSearchChange }) {
  const handleClear = () => {
    onSearchChange('');
  };

  return (
    <div className="search-bar-container">
      <input
        type="text"
        className="search-bar"
        placeholder="Rechercher une recette, un ingrédient, un tag..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      {searchQuery && (
        <button className="clear-search" onClick={handleClear}>
          ✕
        </button>
      )}
    </div>
  );
}

export default SearchBar;
