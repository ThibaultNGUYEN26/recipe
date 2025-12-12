import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import './SettingsMenu.css';

function SettingsMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const { language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();
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
  };

  const handleThemeToggle = () => {
    toggleTheme();
  };

  return (
    <div className="settings-menu" ref={menuRef}>
      <button
        className={`settings-button ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Menu"
      >
        <span className="burger-line"></span>
        <span className="burger-line"></span>
        <span className="burger-line"></span>
      </button>

      {isOpen && (
        <div className="settings-dropdown">
          <div className="settings-section">
            <div className="settings-header">
              <span className="settings-title">
                {language === 'fr' ? 'Langue' : 'Language'}
              </span>
              <div className="toggle-container">
                <span className={`toggle-label ${language === 'fr' ? 'active' : ''}`}>FR</span>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={language === 'en'}
                    onChange={() => handleLanguageChange(language === 'fr' ? 'en' : 'fr')}
                  />
                  <span className="toggle-slider"></span>
                </label>
                <span className={`toggle-label ${language === 'en' ? 'active' : ''}`}>EN</span>
              </div>
            </div>
          </div>

          <div className="settings-section">
            <div className="settings-header">
              <span className="settings-title">
                {language === 'fr' ? 'Thème' : 'Theme'}
              </span>
              <div className="toggle-container">
                <span className={`toggle-label ${theme === 'light' ? 'active' : ''}`}>☀️</span>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={theme === 'dark'}
                    onChange={handleThemeToggle}
                  />
                  <span className="toggle-slider"></span>
                </label>
                <span className={`toggle-label ${theme === 'dark' ? 'active' : ''}`}>🌙</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SettingsMenu;
