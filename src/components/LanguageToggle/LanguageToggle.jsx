import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import './LanguageToggle.css';

function LanguageToggle() {
  const { language, toggleLanguage } = useLanguage();

  return (
    <button
      className="language-toggle"
      onClick={toggleLanguage}
      aria-label="Toggle language"
    >
      <span className={`flag ${language === 'fr' ? 'active' : ''}`}>🇫🇷</span>
      <span className={`flag ${language === 'en' ? 'active' : ''}`}>🇬🇧</span>
    </button>
  );
}

export default LanguageToggle;
