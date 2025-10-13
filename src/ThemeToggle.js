import React from 'react';
import { useTheme } from './ThemeContext';
import { Button } from 'react-bootstrap';

const ThemeToggle = () => {
  const { theme, themePreference, toggleTheme } = useTheme();

  const getButtonContent = () => {
    switch (themePreference) {
      case 'light':
        return (
          <>
            <i className="bi bi-sun-fill me-1"></i>
            Light
          </>
        );
      case 'dark':
        return (
          <>
            <i className="bi bi-moon-stars-fill me-1"></i>
            Dark
          </>
        );
      case 'system':
        return (
          <>
            <i className="bi bi-display me-1"></i>
            System ({theme === 'dark' ? 'Dark' : 'Light'})
          </>
        );
      default:
        return (
          <>
            <i className="bi bi-circle-half me-1"></i>
            Theme
          </>
        );
    }
  };

  return (
    <Button 
      onClick={toggleTheme}
      variant={theme === 'dark' ? 'light' : 'dark'}
      size="sm"
      className="ms-2"
      aria-label="Toggle theme"
      title={`Current: ${themePreference}${themePreference === 'system' ? ` (${theme})` : ''}`}
    >
      {getButtonContent()}
    </Button>
  );
};

export default ThemeToggle;