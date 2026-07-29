import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Palette, ThemeMode, lightPalette, darkPalette } from '../config/theme';
import { tokenStorage } from '../api/storage';

interface ThemeState {
  mode: ThemeMode;
  palette: Palette;
  setMode: (m: ThemeMode) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeState | null>(null);

const STORAGE_KEY = 'theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('light');

  useEffect(() => {
    void (async () => {
      const stored = await tokenStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark') setModeState(stored);
    })();
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    void tokenStorage.setItem(STORAGE_KEY, m);
  }, []);

  const toggle = useCallback(() => {
    setModeState((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      void tokenStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const palette = useMemo<Palette>(() => (mode === 'dark' ? darkPalette : lightPalette), [mode]);

  const value = useMemo<ThemeState>(() => ({ mode, palette, setMode, toggle }), [mode, palette, setMode, toggle]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeState {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}