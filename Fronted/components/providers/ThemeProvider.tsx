// components/providers/ThemeProvider.tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
  bgOutput: string; // 👈 Añadido formalmente al tipado global
  border: string;   // 👈 Añadido formalmente al tipado global
  themeClasses: {
    bg: string;
    textPrimary: string;
    textMuted: string;
    cardBg: string;
    border: string;
  };
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useThemeContext() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within ThemeProvider');
  }
  return context;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setIsDark(savedTheme === 'dark');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDark(prefersDark);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // Valores de color en crudo/hexadecimales que requiere tu OutputPanel inline style
  const bgOutput = isDark ? '#1a1a1a' : '#ffffff'; // Color de fondo para el output
  const border = isDark ? '#262626' : '#e5e7eb';   // Color de borde en CSS puro

  // Clases de utilidad para Tailwind CSS
  const themeClasses = {
    bg: isDark ? 'bg-[#0d0d0d]' : 'bg-gray-50',
    textPrimary: isDark ? 'text-white' : 'text-gray-900',
    textMuted: isDark ? 'text-gray-400' : 'text-gray-500',
    cardBg: isDark ? 'bg-[#1a1a1a]' : 'bg-white',
    border: isDark ? 'border-gray-800' : 'border-gray-200',
  };

  return (
    <ThemeContext.Provider
      value={{
        isDark,
        toggleTheme: () => setIsDark(!isDark),
        bgOutput, // 👈 Se inyecta el valor dinámico en el contexto
        border,   // 👈 Se inyecta el valor dinámico en el contexto
        themeClasses,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}