import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import './SettingsMenu.css';

function SettingsMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const { language, setLanguage } = useLanguage();
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLanguageChange = (lang) => {
    setLanguage(lang);
    setIsOpen(false);
  };

  return (
    <div className="settings-menu" ref={menuRef}>
      <button
        className="settings-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Settings menu"
      >
        ⚙️
      </button>

      {isOpen && (
        <div className="settings-dropdown">
          <div className="settings-section">
            <h3 className="settings-title">
              {language === 'fr' ? 'Langue' : 'Language'}
            </h3>
            <button
              className={`settings-option ${language === 'fr' ? 'active' : ''}`}
              onClick={() => handleLanguageChange('fr')}
            >
              <span className="option-icon">FR</span>
              <span className="option-text">Français</span>
            </button>
            <button
              className={`settings-option ${language === 'en' ? 'active' : ''}`}
              onClick={() => handleLanguageChange('en')}
            >
              <span className="option-icon">EN</span>
              <span className="option-text">English</span>
            </button>
          </div>

          {/* Placeholder for future dark theme option */}
          {/* <div className="settings-section">
            <h3 className="settings-title">
              {language === 'fr' ? 'Thème' : 'Theme'}
            </h3>
            <button className="settings-option">
              <span className="option-icon">🌙</span>
              <span className="option-text">
                {language === 'fr' ? 'Mode sombre' : 'Dark mode'}
              </span>
            </button>
          </div> */}
        </div>
      )}
    </div>
  );
}

export default SettingsMenu;
