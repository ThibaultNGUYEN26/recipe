import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { loadLanguage, supportedLanguages, translate } from '../i18n/translations';
import { apiFetch } from '../lib/apiFetch';

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
    if (supportedLanguages.includes(savedLanguage)) return savedLanguage;
    const browserLanguage = navigator.language?.toLowerCase().split('-')[0];
    if (supportedLanguages.includes(browserLanguage)) return browserLanguage;
    return 'en';
  });
  const [, setLocaleVersion] = useState(0);

  useEffect(() => {
    let active = true;
    loadLanguage(language).then(() => {
      if (active) setLocaleVersion((version) => version + 1);
    });
    return () => { active = false; };
  }, [language]);

  useEffect(() => {
    localStorage.setItem('savorAppLanguage', language);
    document.documentElement.lang = language;
    document.documentElement.classList.toggle('locale-rtl', language === 'ar');
  }, [language]);

  useEffect(() => {
    if (!user) return;
    if (supportedLanguages.includes(user.preferredLanguage)) {
      setLanguage(user.preferredLanguage);
      return;
    }

    apiFetch('/api/users/me/preferences', {
      method: 'PATCH',
      body: JSON.stringify({ preferredLanguage: language }),
    })
      .then((response) => response.ok && updateUser({ preferredLanguage: language }))
      .catch(() => {});
  }, [user?.id, user?.preferredLanguage]);

  const setPreferredLanguage = async (nextLanguage) => {
    if (!supportedLanguages.includes(nextLanguage)) return;
    setLanguage(nextLanguage);
    if (!user) return;

    updateUser({ preferredLanguage: nextLanguage });
    try {
      const response = await apiFetch('/api/users/me/preferences', {
        method: 'PATCH',
        body: JSON.stringify({ preferredLanguage: nextLanguage }),
      });
      if (!response.ok) throw new Error('Failed to save language preference');
    } catch {
      // The local preference remains usable if account sync is temporarily unavailable.
    }
  };

  const toggleLanguage = () => {
    setPreferredLanguage(supportedLanguages[(supportedLanguages.indexOf(language) + 1) % supportedLanguages.length]);
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
