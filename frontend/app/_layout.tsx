import React from 'react';
import { DarkTheme as NavDark, DefaultTheme as NavLight, ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../src/auth/AuthContext';
import { ThemeProvider, useTheme } from '../src/config/ThemeContext';
import { LanguageProvider, useI18n } from '../src/i18n';

function NavShell() {
  const { mode, palette } = useTheme();
  const { t } = useI18n();
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
        <Stack.Screen name="register/[id]" options={{ headerShown: true, title: t('nav.register') }} />
        <Stack.Screen name="module/[code]" options={{ headerShown: true, title: t('nav.module') }} />
        <Stack.Screen name="admission/list" options={{ headerShown: true, title: t('nav.admissionRegister') }} />
        <Stack.Screen name="admission/new" options={{ headerShown: true, title: t('nav.newAdmission') }} />
        <Stack.Screen name="admission/[id]" options={{ headerShown: true, title: t('nav.admissionApplication') }} />
        <Stack.Screen name="visit-book/list" options={{ headerShown: true, title: t('nav.visitBook') }} />
        <Stack.Screen name="visit-book/new" options={{ headerShown: true, title: t('nav.newEntry') }} />
        <Stack.Screen name="visit-book/[id]" options={{ headerShown: true, title: t('nav.entryDetails') }} />
        <Stack.Screen name="inward/list" options={{ headerShown: true, title: t('nav.inwardRegister') }} />
        <Stack.Screen name="inward/new" options={{ headerShown: true, title: t('nav.newEntry') }} />
        <Stack.Screen name="inward/[id]" options={{ headerShown: true, title: t('nav.entryDetails') }} />
        <Stack.Screen name="employee-inout/list" options={{ headerShown: true, title: t('nav.inoutRegister') }} />
        <Stack.Screen name="employee-inout/new" options={{ headerShown: true, title: t('nav.newEntry') }} />
        <Stack.Screen name="employee-inout/[id]" options={{ headerShown: true, title: t('nav.entryDetails') }} />
        <Stack.Screen name="distribution/list" options={{ headerShown: true, title: t('nav.distributionRegister') }} />
        <Stack.Screen name="distribution/new" options={{ headerShown: true, title: t('nav.newEntry') }} />
        <Stack.Screen name="distribution/[id]" options={{ headerShown: true, title: t('nav.entryDetails') }} />
        <Stack.Screen name="schema-register/[code]/list" options={{ headerShown: true, title: t('nav.register') }} />
        <Stack.Screen name="schema-register/[code]/new" options={{ headerShown: true, title: t('nav.newEntry') }} />
        <Stack.Screen name="schema-register/[code]/[id]" options={{ headerShown: true, title: t('nav.entryDetails') }} />
        <Stack.Screen name="medical/list" options={{ headerShown: true, title: t('nav.medicalRegister') }} />
        <Stack.Screen name="medical/new" options={{ headerShown: true, title: t('nav.newEntry') }} />
        <Stack.Screen name="medical/[id]" options={{ headerShown: true, title: t('nav.entryDetails') }} />
        <Stack.Screen name="cashbook/list" options={{ headerShown: true, title: t('nav.cashBook') }} />
        <Stack.Screen name="cashbook/new" options={{ headerShown: true, title: t('nav.newEntry') }} />
        <Stack.Screen name="cashbook/[id]" options={{ headerShown: true, title: t('nav.entryDetails') }} />
        <Stack.Screen name="yearwise-admission/list" options={{ headerShown: true, title: t('nav.yearwiseAdmission') }} />
        <Stack.Screen name="yearwise-admission/new" options={{ headerShown: true, title: t('nav.newEntry') }} />
        <Stack.Screen name="yearwise-admission/[id]" options={{ headerShown: true, title: t('nav.entryDetails') }} />
        <Stack.Screen name="resident-attendance/list" options={{ headerShown: true, title: t('nav.residentAttendance') }} />
        <Stack.Screen name="resident-attendance/[date]" options={{ headerShown: true, title: t('nav.dailyAttendance') }} />
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