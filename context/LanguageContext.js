import React, { createContext, useContext, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const LanguageContext = createContext();

export const LANGUAGE_OPTIONS = [
  {
    code: 'de',
    name: 'Deutsch',
    nativeName: 'Deutsch',
    flag: '🇩🇪'
  },
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇬🇧'
  },
  {
    code: 'vi',
    name: 'Vietnamese',
    nativeName: 'Tiếng Việt',
    flag: '🇻🇳'
  }
];

export function LanguageProvider({ children }) {
  const { i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState('de');

  useEffect(() => {
    // Load saved language from localStorage on mount
    if (typeof window !== 'undefined') {
      const savedLanguage = localStorage.getItem('appLanguage') || 'de';
      if (savedLanguage !== currentLanguage) {
        setCurrentLanguage(savedLanguage);
        i18n.changeLanguage(savedLanguage);
      }
    }
  }, []);

  const changeLanguage = (languageCode) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('appLanguage', languageCode);
    }
    setCurrentLanguage(languageCode);
    i18n.changeLanguage(languageCode);
  };

  const getCurrentLanguageInfo = () => {
    return LANGUAGE_OPTIONS.find(lang => lang.code === currentLanguage) || LANGUAGE_OPTIONS[0];
  };

  const value = {
    currentLanguage,
    changeLanguage,
    languages: LANGUAGE_OPTIONS,
    currentLanguageInfo: getCurrentLanguageInfo()
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

export default LanguageContext;
