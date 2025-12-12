import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { getTranslation } from '../../translations/translations';
import './SearchBar.css';

function SearchBar({ searchQuery, onSearchChange }) {
  const handleClear = () => {
    onSearchChange('');
  };
  const { language } = useLanguage();

  return (
    <div className="search-bar-container">
      <input
        type="text"
        className="search-bar"
        placeholder={getTranslation(language, 'searchPlaceholder')}
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
