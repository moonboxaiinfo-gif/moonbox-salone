import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  className?: string;
  variant?: 'button' | 'icon';
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '', variant = 'icon' }) => {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      type="button"
      className={`p-2 rounded-xl transition-all duration-200 flex items-center gap-2 ${
        resolvedTheme === 'dark'
          ? 'text-primary hover:text-foreground bg-card hover:bg-elevated border border-border'
          : 'text-primary hover:text-foreground bg-card hover:bg-elevated border border-border'
      } ${className}`}
      title={`Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} mode`}
      aria-label={`Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} mode`}
    >
      {resolvedTheme === 'dark' ? (
        <Sun className="w-4 h-4 text-primary" />
      ) : (
        <Moon className="w-4 h-4 text-primary" />
      )}
      {variant === 'button' && (
        <span className="text-xs font-semibold">
          {resolvedTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </span>
      )}
    </button>
  );
};
