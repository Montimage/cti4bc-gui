import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const getInitialTheme = () => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      return savedTheme;
    }
    return 'system'; // Default to system theme
  };

  const getSystemTheme = () => {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches 
      ? 'dark' 
      : 'light';
  };

  const getEffectiveTheme = (themePreference) => {
    if (themePreference === 'system') {
      return getSystemTheme();
    }
    return themePreference;
  };

  const [themePreference, setThemePreference] = useState(getInitialTheme);
  const [effectiveTheme, setEffectiveTheme] = useState(() => getEffectiveTheme(getInitialTheme()));

  const setTheme = (newTheme) => {
    setThemePreference(newTheme);
    const newEffectiveTheme = getEffectiveTheme(newTheme);
    setEffectiveTheme(newEffectiveTheme);
    localStorage.setItem('theme', newTheme);
  };

  const toggleTheme = () => {
    const themes = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(themePreference);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  // Listen for system theme changes when in system mode
  useEffect(() => {
    if (themePreference === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      const handleSystemThemeChange = (e) => {
        const newSystemTheme = e.matches ? 'dark' : 'light';
        setEffectiveTheme(newSystemTheme);
      };

      mediaQuery.addEventListener('change', handleSystemThemeChange);
      
      // Update effective theme in case system theme changed while not in system mode
      setEffectiveTheme(getSystemTheme());

      return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
    }
  }, [themePreference]);

  useEffect(() => {
    document.documentElement.setAttribute('data-bs-theme', effectiveTheme);
  }, [effectiveTheme]);

  return (
    <ThemeContext.Provider value={{ 
      theme: effectiveTheme, 
      themePreference, 
      setTheme, 
      toggleTheme,
      getSystemTheme 
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};