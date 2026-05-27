'use client';
import { createContext, useContext, useEffect, useState } from 'react';

const ThemeCtx = createContext({ theme: 'light', toggle: () => {} });

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    const saved = localStorage.getItem('curius-theme');
    if (saved) setTheme(saved);
    else if (window.matchMedia('(prefers-color-scheme: dark)').matches) setTheme('dark');
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('curius-theme', theme);
  }, [theme]);

  return (
    <ThemeCtx.Provider value={{ theme, toggle: () => setTheme(t => t === 'light' ? 'dark' : 'light') }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export const useTheme = () => useContext(ThemeCtx);
