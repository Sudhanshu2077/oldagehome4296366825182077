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
  primary: '#f97316',
  primaryDark: '#ea580c',
  primaryLight: '#fdba74',
  secondary: '#fff7ed',
  accent: '#fb923c',
  background: '#faf7f4',
  backgroundSoft: '#fdf6f0',
  surface: '#ffffff',
  surfaceAlt: '#fffaf5',
  border: '#f0e4d8',
  borderSoft: '#f7ece2',
  text: '#241a12',
  textMuted: '#8a7a6c',
  textInverse: '#ffffff',
  error: '#dc2626',
  success: '#16a34a',
  warning: '#d97706',
  info: '#2563eb',
  overlay: 'rgba(40,25,10,0.35)',
};

export const darkPalette: Palette = {
  primary: '#fb923c',
  primaryDark: '#f97316',
  primaryLight: '#fed7aa',
  secondary: '#3a2417',
  accent: '#fb923c',
  background: '#161210',
  backgroundSoft: '#1f1714',
  surface: '#241b16',
  surfaceAlt: '#2a201a',
  border: '#3a2b22',
  borderSoft: '#2f241d',
  text: '#f7eee6',
  textMuted: '#b09a8a',
  textInverse: '#1a120e',
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
  card: { shadowColor: '#7a4a1a', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  soft: { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
} as const;