import React, { createContext, useContext, useEffect, useState } from "react";

export type Theme = "light" | "dark" | "saffron";

interface ThemeContextType {
  theme: Theme;
  toggleTheme?: () => void;
  cycleTheme?: () => void;
  switchable: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  switchable?: boolean;
}

export function ThemeProvider({
  children,
  defaultTheme = "light",
  switchable = false,
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (switchable) {
      const stored = localStorage.getItem("theme");
      return stored === "dark" || stored === "saffron" || stored === "light"
        ? stored
        : defaultTheme;
    }
    return defaultTheme;
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.classList.toggle("theme-dark", theme === "dark");
    root.classList.toggle("theme-light", theme === "light");
    root.classList.toggle("theme-saffron", theme === "saffron");
    root.dataset.theme = theme;

    if (switchable) {
      localStorage.setItem("theme", theme);
    }
  }, [theme, switchable]);

  const toggleTheme = switchable
    ? () => {
        setTheme(prev => (prev === "light" ? "dark" : "light"));
      }
    : undefined;
  const cycleTheme = switchable
    ? () => {
        setTheme(prev =>
          prev === "light" ? "dark" : prev === "dark" ? "saffron" : "light"
        );
      }
    : undefined;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, cycleTheme, switchable }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
