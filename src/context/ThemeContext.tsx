import React, { createContext, useContext, useEffect, ReactNode } from 'react';

export type AppTheme = 'light';

interface ThemeContextType {
  theme: AppTheme;
  isDark: boolean;
  colorScheme?: string;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  useEffect(() => {
    try {
      const root = document.documentElement;
      root.classList.remove('dark', 'navy');
      root.classList.add('light');
      root.setAttribute('data-theme', 'light');
      localStorage.setItem('baadre_smarteye_theme', 'light');
    } catch {
      // ignore
    }
  }, []);

  const setTheme = (_newTheme: AppTheme) => {
    // Permanent light theme
  };

  const toggleTheme = () => {
    // Permanent light theme
  };

  return (
    <ThemeContext.Provider value={{
      theme: 'light',
      isDark: false,
      colorScheme: 'emerald',
      setTheme,
      toggleTheme
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
