import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import './SettingsMenu.css';

function SettingsMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const { language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
                    onChange={() => setLanguage(language === 'fr' ? 'en' : 'fr')}
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
                    onChange={toggleTheme}
                  />
                  <span className="toggle-slider"></span>
                </label>
                <span className={`toggle-label ${theme === 'dark' ? 'active' : ''}`}>🌙</span>
              </div>
            </div>
          </div>

          <div className="settings-section settings-auth">
            {user ? (
              <>
                <span className="settings-user">
                  👤 {user.name || user.email}
                </span>
                <Link to={`/profile/${user.id}`} className="settings-login" onClick={() => setIsOpen(false)}>
                  {language === 'fr' ? 'Mon profil' : 'My profile'}
                </Link>
                <Link to="/settings/profile" className="settings-login" onClick={() => setIsOpen(false)}>
                  {language === 'fr' ? 'Modifier le profil' : 'Edit profile'}
                </Link>
                <button className="settings-logout" onClick={() => { logout(); setIsOpen(false); }}>
                  {language === 'fr' ? 'Déconnexion' : 'Log out'}
                </button>
              </>
            ) : (
              <Link to="/login" className="settings-login" onClick={() => setIsOpen(false)}>
                {language === 'fr' ? 'Se connecter' : 'Log in'}
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SettingsMenu;
