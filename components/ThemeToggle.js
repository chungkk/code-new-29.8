import React from 'react';
import { useTheme } from '../context/ThemeContext';

const ThemeToggle = () => {
  const { toggleTheme, currentTheme } = useTheme();

  return (
    <button
      className="theme-toggle-button"
      onClick={toggleTheme}
      aria-label={`Current theme: ${currentTheme?.label}. Click to toggle theme`}
      title={`Theme: ${currentTheme?.label}`}
    >
      <span className="theme-toggle-icon" role="img" aria-label={currentTheme?.label}>
        {currentTheme?.emoji || '🎨'}
      </span>
    </button>
  );
};

export default ThemeToggle;
