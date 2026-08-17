import React from 'react';
import { DarkTheme as NavDark, DefaultTheme as NavLight, ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../src/auth/AuthContext';
import { ThemeProvider, useTheme } from '../src/config/ThemeContext';
import { LanguageProvider } from '../src/i18n';

function NavShell() {
  const { mode, palette } = useTheme();
  const base = mode === 'dark' ? NavDark : NavLight;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: palette.primary,
      background: palette.background,
      card: palette.surface,
      text: palette.text,
      border: palette.border,
      notification: palette.primary,
    },
  };
  return (
    <NavThemeProvider value={navTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="onboard" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="register/[id]" options={{ headerShown: true, title: 'Register' }} />
        <Stack.Screen name="module/[code]" options={{ headerShown: true, title: 'Module' }} />
        <Stack.Screen name="admission/list" options={{ headerShown: true, title: 'Admission Register' }} />
        <Stack.Screen name="admission/new" options={{ headerShown: true, title: 'New Admission Application' }} />
        <Stack.Screen name="admission/[id]" options={{ headerShown: true, title: 'Admission Application' }} />
        <Stack.Screen name="visit-book/list" options={{ headerShown: true, title: 'VISIT BOOK' }} />
        <Stack.Screen name="visit-book/new" options={{ headerShown: true, title: 'New Entry' }} />
        <Stack.Screen name="visit-book/[id]" options={{ headerShown: true, title: 'Entry Details' }} />
      </Stack>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
    </NavThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <NavShell />
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}