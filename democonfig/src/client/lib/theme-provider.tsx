/**
 * Theme Provider
 *
 * Reads theme configuration from apps.json and applies it to the app.
 * - Sets CSS custom properties for colors, fonts, spacing, etc.
 * - Supports light/dark mode toggle
 * - Applies layout configuration
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAppConfig } from './app-config';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  resolvedMode: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'light',
  setMode: () => {},
  resolvedMode: 'light',
});

export function useTheme() {
  return useContext(ThemeContext);
}

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { app, loading } = useAppConfig();
  const [mode, setMode] = useState<ThemeMode>('light');
  const [resolvedMode, setResolvedMode] = useState<'light' | 'dark'>('light');

  // Initialize theme mode from config or localStorage
  useEffect(() => {
    const stored = localStorage.getItem('theme-mode') as ThemeMode;
    const defaultMode = app?.theme?.mode || 'light';
    const initialMode = stored || defaultMode;
    setMode(initialMode);
  }, [app]);

  // Resolve actual theme (handle 'system' mode)
  useEffect(() => {
    const resolved = mode === 'system' ? getSystemTheme() : mode;
    setResolvedMode(resolved);

    // Listen for system theme changes
    if (mode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e: MediaQueryListEvent) => {
        setResolvedMode(e.matches ? 'dark' : 'light');
      };
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [mode]);

  // Apply theme to document
  useEffect(() => {
    if (loading || !app?.theme) return;

    const root = document.documentElement;
    const theme = app.theme;
    const colors = theme.colors?.[resolvedMode] || theme.colors?.light || {};

    // Apply theme mode class
    root.classList.remove('light', 'dark');
    root.classList.add(resolvedMode);

    // Apply color variables
    Object.entries(colors).forEach(([key, value]) => {
      const cssVar = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
      root.style.setProperty(cssVar, value as string);
    });

    // Apply font families
    if (theme.fonts) {
      root.style.setProperty('--font-heading', theme.fonts.heading || 'inherit');
      root.style.setProperty('--font-body', theme.fonts.body || 'inherit');
      root.style.setProperty('--font-mono', theme.fonts.mono || 'monospace');
    }

    // Apply font sizes
    if (theme.fontSizes) {
      Object.entries(theme.fontSizes).forEach(([key, value]) => {
        root.style.setProperty(`--font-size-${key}`, value as string);
      });
    }

    // Apply spacing scale
    if (theme.spacing?.scale) {
      root.style.setProperty('--spacing-scale', String(theme.spacing.scale));
    }

    // Apply border radius
    if (theme.radius) {
      Object.entries(theme.radius).forEach(([key, value]) => {
        root.style.setProperty(`--radius-${key}`, value as string);
      });
    }

    // Apply shadows
    if (theme.shadows) {
      Object.entries(theme.shadows).forEach(([key, value]) => {
        root.style.setProperty(`--shadow-${key}`, value as string);
      });
    }

    // Apply layout CSS variables
    if (app.layout) {
      root.style.setProperty('--sidebar-width', app.layout.sidebarWidth || '280px');
      root.style.setProperty('--header-height', app.layout.headerHeight || '56px');
      root.style.setProperty('--content-padding', app.layout.contentPadding || '24px');
      if (app.layout.contentMaxWidth) {
        root.style.setProperty('--content-max-width', app.layout.contentMaxWidth);
      }
    }
  }, [app, resolvedMode, loading]);

  const handleSetMode = (newMode: ThemeMode) => {
    setMode(newMode);
    localStorage.setItem('theme-mode', newMode);
  };

  return (
    <ThemeContext.Provider value={{ mode, setMode: handleSetMode, resolvedMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Theme toggle button component
 */
export function ThemeToggle() {
  const { mode, setMode, resolvedMode } = useTheme();
  const { app } = useAppConfig();

  if (!app?.theme?.allowModeToggle) return null;

  const Icon = resolvedMode === 'dark'
    ? () => <span>☀️</span>
    : () => <span>🌙</span>;

  return (
    <button
      onClick={() => setMode(resolvedMode === 'dark' ? 'light' : 'dark')}
      className="p-2 rounded-md hover:bg-accent"
      title={`Switch to ${resolvedMode === 'dark' ? 'light' : 'dark'} mode`}
    >
      <Icon />
    </button>
  );
}
