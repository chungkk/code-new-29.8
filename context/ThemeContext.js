import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback
} from 'react';

const ThemeContext = createContext();

export const THEME_OPTIONS = [
  {
    id: 'sunset',
    label: 'Sonnenuntergang',
    description: 'Warme Orange- und Pinknuancen für ein gemütliches Gefühl.',
    emoji: '🌅'
  },
  {
    id: 'dark',
    label: 'Nachtmodus',
    description: 'Kontrastreicher Dark Mode für späte Lernsessions.',
    emoji: '🌙'
  }
];

const DEFAULT_THEME_ID = THEME_OPTIONS[0].id;

const getNextThemeId = (currentId) => {
  const currentIndex = THEME_OPTIONS.findIndex((option) => option.id === currentId);
  if (currentIndex === -1) {
    return DEFAULT_THEME_ID;
  }
  const nextIndex = (currentIndex + 1) % THEME_OPTIONS.length;
  return THEME_OPTIONS[nextIndex].id;
};

const resolveInitialTheme = () => {
  if (typeof window === 'undefined') {
    return DEFAULT_THEME_ID;
  }

  const savedTheme = window.localStorage.getItem('theme');
  const isValid = THEME_OPTIONS.some((option) => option.id === savedTheme);
  const themeToUse = isValid ? savedTheme : DEFAULT_THEME_ID;

  if (!isValid) {
    window.localStorage.setItem('theme', themeToUse);
  }

  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', themeToUse);
  }

  return themeToUse;
};

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(resolveInitialTheme);

  const applyTheme = useCallback((themeId) => {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-theme', themeId);
  }, []);

  useEffect(() => {
    applyTheme(theme);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('theme', theme);
    }
  }, [theme, applyTheme]);

  const selectTheme = useCallback((themeId) => {
    const isValidTheme = THEME_OPTIONS.some((option) => option.id === themeId);
    if (!isValidTheme) return;
    setThemeState((current) => (current === themeId ? current : themeId));
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => getNextThemeId(current));
  }, []);

  const value = useMemo(() => {
    const currentTheme = THEME_OPTIONS.find((option) => option.id === theme) || THEME_OPTIONS[0];
    const nextThemeId = getNextThemeId(theme);
    const nextTheme = THEME_OPTIONS.find((option) => option.id === nextThemeId);

    return {
      theme,
      themeOptions: THEME_OPTIONS,
      currentTheme,
      nextTheme,
      setTheme: selectTheme,
      toggleTheme
    };
  }, [theme, selectTheme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
