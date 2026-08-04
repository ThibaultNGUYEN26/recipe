import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { translate } from '../i18n/translations';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const { user, updateUser } = useAuth();
  const [language, setLanguage] = useState(() => {
    const savedLanguage = localStorage.getItem('savorAppLanguage') || localStorage.getItem('recipeLanguage');
    if (savedLanguage === 'fr' || savedLanguage === 'en' || savedLanguage === 'es') return savedLanguage;
    const browserLanguage = navigator.language?.toLowerCase();
    if (browserLanguage?.startsWith('fr')) return 'fr';
    if (browserLanguage?.startsWith('es')) return 'es';
    return 'en';
  });

  useEffect(() => {
    localStorage.setItem('savorAppLanguage', language);
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    if (!user) return;
    if (user.preferredLanguage === 'fr' || user.preferredLanguage === 'en' || user.preferredLanguage === 'es') {
      setLanguage(user.preferredLanguage);
      return;
    }

    fetch(`${import.meta.env.VITE_API_URL}/api/users/me/preferences`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ preferredLanguage: language }),
    })
      .then((response) => response.ok && updateUser({ preferredLanguage: language }))
      .catch(() => {});
  }, [user?.id, user?.preferredLanguage]);

  const setPreferredLanguage = async (nextLanguage) => {
    if (nextLanguage !== 'fr' && nextLanguage !== 'en' && nextLanguage !== 'es') return;
    setLanguage(nextLanguage);
    if (!user) return;

    updateUser({ preferredLanguage: nextLanguage });
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/users/me/preferences`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ preferredLanguage: nextLanguage }),
      });
      if (!response.ok) throw new Error('Failed to save language preference');
    } catch {
      // The local preference remains usable if account sync is temporarily unavailable.
    }
  };

  const toggleLanguage = () => {
    const languages = ['en', 'fr', 'es'];
    setPreferredLanguage(languages[(languages.indexOf(language) + 1) % languages.length]);
  };

  const value = {
    language,
    t: (key, values) => translate(language, key, values),
    setLanguage: setPreferredLanguage,
    setPreferredLanguage,
    toggleLanguage
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};
