export type ThemeMode = 'light' | 'dark';

export interface Palette {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  secondary: string;
  accent: string;
  background: string;
  backgroundSoft: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  borderSoft: string;
  text: string;
  textMuted: string;
  textInverse: string;
  error: string;
  success: string;
  warning: string;
  info: string;
  overlay: string;
}

export const lightPalette: Palette = {
  primary: '#2563eb',
  primaryDark: '#1d4ed8',
  primaryLight: '#93c5fd',
  secondary: '#eff6ff',
  accent: '#3b82f6',
  background: '#f5f8fc',
  backgroundSoft: '#eef4fc',
  surface: '#ffffff',
  surfaceAlt: '#f8fbff',
  border: '#dbe6f3',
  borderSoft: '#e4edf7',
  text: '#0f1e33',
  textMuted: '#5b6b83',
  textInverse: '#ffffff',
  error: '#dc2626',
  success: '#16a34a',
  warning: '#d97706',
  info: '#2563eb',
  overlay: 'rgba(10,25,50,0.35)',
};

export const darkPalette: Palette = {
  primary: '#60a5fa',
  primaryDark: '#3b82f6',
  primaryLight: '#bfdbfe',
  secondary: '#0f2233',
  accent: '#60a5fa',
  background: '#0b1322',
  backgroundSoft: '#111a2c',
  surface: '#16213a',
  surfaceAlt: '#1b2742',
  border: '#27365a',
  borderSoft: '#1f2c4a',
  text: '#e8eefb',
  textMuted: '#8fa3c4',
  textInverse: '#0a1220',
  error: '#f87171',
  success: '#4ade80',
  warning: '#fbbf24',
  info: '#60a5fa',
  overlay: 'rgba(0,0,0,0.6)',
};

export const colors = lightPalette;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radii = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const typography = {
  heading: { fontSize: 20, fontWeight: '700' as const },
  subheading: { fontSize: 16, fontWeight: '600' as const },
  body: { fontSize: 14, fontWeight: '400' as const },
  caption: { fontSize: 12, fontWeight: '400' as const },
  small: { fontSize: 11, fontWeight: '500' as const },
} as const;

export const shadows = {
  card: { shadowColor: '#1e3a8a', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  soft: { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
} as const;