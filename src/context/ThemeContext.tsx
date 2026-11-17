import React, { createContext, useContext, useState, useEffect, useLayoutEffect, useCallback } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const THEME_STORAGE_KEY = 'moonbox_salon_theme_mode';

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark';
  try {
    if (typeof window.matchMedia === 'function') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
  } catch (e) {
    // Ignore matchMedia evaluation error
  }
  return 'dark';
}

function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') {
    return getSystemTheme();
  }
  return mode;
}

function applyThemeToDOM(resolved: 'light' | 'dark') {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  if (resolved === 'dark') {
    root.classList.remove('light');
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
    root.style.colorScheme = 'dark';
    if (document.body) {
      document.body.style.backgroundColor = 'var(--mb-bg)';
      document.body.style.color = 'var(--mb-text)';
    }
  } else {
    root.classList.remove('dark');
    root.classList.add('light');
    root.setAttribute('data-theme', 'light');
    root.style.colorScheme = 'light';
    if (document.body) {
      document.body.style.backgroundColor = 'var(--mb-bg)';
      document.body.style.color = 'var(--mb-text)';
    }
  }
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        const initialResolved = resolveTheme(stored as ThemeMode);
        applyThemeToDOM(initialResolved);
        return stored as ThemeMode;
      }
    } catch {
      // Ignore localStorage read errors
    }
    // Default to Moonbox Midnight Dark
    const defaultTheme: ThemeMode = 'dark';
    applyThemeToDOM('dark');
    return defaultTheme;
  });

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => resolveTheme(theme));

  // Immediate synchronous setter that persists and updates DOM right away
  const setTheme = useCallback((newTheme: ThemeMode) => {
    const resolved = resolveTheme(newTheme);
    // 1. Immediately apply to DOM classList so UI changes without delay
    applyThemeToDOM(resolved);

    // 2. Persist in localStorage
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch {
      // Ignore write errors
    }

    // 3. Synchronize React state
    setThemeState(newTheme);
    setResolvedTheme(resolved);
  }, []);

  const toggleTheme = useCallback(() => {
    const next: ThemeMode = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  }, [resolvedTheme, setTheme]);

  // Handle system preference changes when in 'system' mode
  useLayoutEffect(() => {
    try {
      // Ensure DOM is in sync with current state
      const currentResolved = resolveTheme(theme);
      applyThemeToDOM(currentResolved);
      setResolvedTheme(currentResolved);

      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      if (!mediaQuery) return;

      const handleSystemChange = (e?: any) => {
        if (theme === 'system') {
          const resolved = e && typeof e.matches === 'boolean' ? (e.matches ? 'dark' : 'light') : getSystemTheme();
          applyThemeToDOM(resolved);
          setResolvedTheme(resolved);
        }
      };

      if (typeof mediaQuery.addEventListener === 'function') {
        mediaQuery.addEventListener('change', handleSystemChange);
        return () => mediaQuery.removeEventListener('change', handleSystemChange);
      } else if (typeof (mediaQuery as any).addListener === 'function') {
        (mediaQuery as any).addListener(handleSystemChange);
        return () => (mediaQuery as any).removeListener(handleSystemChange);
      }
    } catch (err) {
      console.warn('[Theme] System theme listener error:', err);
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
