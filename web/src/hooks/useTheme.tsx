import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'sigaweb-theme';

function readInitialTheme(): Theme {
   if (typeof window === 'undefined') return 'light';
   const stored = window.localStorage.getItem(STORAGE_KEY);
   if (stored === 'light' || stored === 'dark') return stored;
   if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';
   return 'light';
}

interface ThemeContextValue {
   theme: Theme;
   setTheme: (t: Theme) => void;
   toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
   const [theme, setThemeState] = useState<Theme>(readInitialTheme);

   useEffect(() => {
      if (typeof document === 'undefined') return;
      document.documentElement.setAttribute('data-theme', theme);
      try {
         window.localStorage.setItem(STORAGE_KEY, theme);
      } catch {
         // ignore quota / private mode errors
      }
   }, [theme]);

   const setTheme = useCallback((t: Theme) => setThemeState(t), []);
   const toggleTheme = useCallback(
      () => setThemeState((current) => (current === 'light' ? 'dark' : 'light')),
      [],
   );

   return (
      <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
         {children}
      </ThemeContext.Provider>
   );
};

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme(): ThemeContextValue {
   const ctx = useContext(ThemeContext);
   if (!ctx) {
      throw new Error('useTheme must be used within a ThemeProvider');
   }
   return ctx;
}
