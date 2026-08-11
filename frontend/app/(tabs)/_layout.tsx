import React, { useEffect, useRef, useState } from 'react';
import { Tabs, Redirect, usePathname, router } from 'expo-router';
import { Text, View, ActivityIndicator, StyleSheet, TouchableOpacity, ScrollView, Animated, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../src/auth/AuthContext';
import { useTheme } from '../../src/config/ThemeContext';
import { useI18n } from '../../src/i18n';
import { spacing, radii } from '../../src/config/theme';

const SIDEBAR_WIDTH = 88;

interface TabDef {
  name: string;
  icon: string;
  labelKey: string;
}

const ALL_TABS: TabDef[] = [
  { name: 'dashboard', icon: 'home', labelKey: 'tab.dashboard' },
  { name: 'gov', icon: 'shield', labelKey: 'tab.gov' },
  { name: 'registers', icon: 'book', labelKey: 'tab.registers' },
  { name: 'inquiries', icon: 'help-circle', labelKey: 'tab.inquiries' },
  { name: 'announcements', icon: 'message-square', labelKey: 'tab.announcements' },
  { name: 'events', icon: 'calendar', labelKey: 'tab.events' },
  { name: 'modules', icon: 'grid', labelKey: 'tab.modules' },
  { name: 'health', icon: 'heart', labelKey: 'tab.health' },
  { name: 'finance', icon: 'dollar-sign', labelKey: 'tab.finance' },
  { name: 'hr', icon: 'users', labelKey: 'tab.hr' },
  { name: 'reports', icon: 'file-text', labelKey: 'tab.reports' },
  { name: 'ai', icon: 'cpu', labelKey: 'tab.ai' },
  { name: 'family', icon: 'smile', labelKey: 'tab.family' },
  { name: 'donor', icon: 'gift', labelKey: 'tab.donor' },
  { name: 'volunteer', icon: 'thumbs-up', labelKey: 'tab.volunteer' },
  { name: 'profile', icon: 'user', labelKey: 'tab.profile' },
];

function isTabVisible(name: string, tier: string | undefined, role: string | undefined): boolean {
  switch (name) {
    case 'dashboard':
    case 'registers':
    case 'modules':
    case 'health':
    case 'finance':
    case 'hr':
    case 'reports':
    case 'ai':
      return tier !== 'external';
    case 'gov':
      return tier === 'government';
    case 'family':
      return tier === 'external' && role === 'family';
    case 'donor':
      return tier === 'external' && role === 'donor';
    case 'volunteer':
      return tier === 'external' && role === 'volunteer';
    default:
      return true;
  }
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const { palette } = useTheme();
  const { t } = useI18n();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();

  const cleanPath = pathname.replace(/^\//, '');
  const currentTab = cleanPath.split('/')[0] || '';

  const visibleTabs = ALL_TABS.filter((tab) => isTabVisible(tab.name, user?.tier, user?.role));

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + spacing.sm }}>
      {visibleTabs.map((tab) => {
        const isFocused = currentTab === tab.name;
        return (
          <TouchableOpacity
            key={tab.name}
            style={[
              styles.tabItem,
              {
                backgroundColor: isFocused ? palette.secondary : 'transparent',
                borderColor: isFocused ? palette.primaryLight : palette.border,
              },
            ]}
            activeOpacity={0.7}
            onPress={() => { onNavigate?.(); if (!isFocused) router.push(`/${tab.name}`); }}
          >
            {tab.name === 'finance' ? (
              <Text style={{ fontSize: 20, fontWeight: '800', color: isFocused ? palette.primary : palette.textMuted, lineHeight: 24 }}>₹</Text>
            ) : (
              <Feather
                name={tab.icon as never}
                size={20}
                color={isFocused ? palette.primary : palette.textMuted}
              />
            )}
            <Text style={[styles.tabLabel, { color: isFocused ? palette.primary : palette.textMuted }]} numberOfLines={1}>{t(tab.labelKey)}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

export default function TabsLayout() {
  const { status, user } = useAuth();
  const { palette } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const translateX = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;

  useEffect(() => {
    Animated.spring(translateX, {
      toValue: drawerOpen ? 0 : -SIDEBAR_WIDTH,
      useNativeDriver: Platform.OS !== 'web',
      bounciness: 4,
      speed: 20,
    }).start();
  }, [drawerOpen, translateX]);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  if (status === 'loading') {
    return (
      <View style={[styles.center, { backgroundColor: palette.background }]}>
        <ActivityIndicator size="large" color={palette.primary} />
      </View>
    );
  }
  if (status === 'signed-out') return <Redirect href="/login" />;

  const hamburger = (
    <TouchableOpacity
      style={styles.hamburger}
      onPress={() => setDrawerOpen(true)}
      activeOpacity={0.7}
      hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
    >
      <Feather name="menu" size={24} color={palette.primaryDark} />
    </TouchableOpacity>
  );

  const sidebarContainer = (
    <>
      {drawerOpen ? (
        <Pressable style={[styles.drawerScrim, { backgroundColor: palette.overlay }]} onPress={() => setDrawerOpen(false)} />
      ) : null}
      <Animated.View style={[
        styles.tabBar,
        styles.drawerMobile,
        {
          backgroundColor: palette.surface,
          borderRightColor: palette.border,
          paddingTop: insets.top + spacing.sm,
          transform: [{ translateX }],
          shadowColor: palette.primaryDark,
        },
      ]}>
        <SidebarBody onNavigate={() => setDrawerOpen(false)} />
      </Animated.View>
    </>
  );

  return (
    <View style={[styles.layout, { backgroundColor: palette.background }]}>
      {sidebarContainer}
      <View style={styles.content}>
        <Tabs
          tabBar={() => null}
          screenOptions={{
            headerTitleAlign: 'center',
            headerLeft: () => hamburger,
            headerStyle: { backgroundColor: palette.surface, shadowColor: palette.primary, shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
            headerTintColor: palette.primaryDark,
            headerTitleStyle: { fontWeight: '700', color: palette.text },
            headerShadowVisible: false,
          }}
        >
          {user?.tier !== 'external' ? (
            <Tabs.Screen name="dashboard" options={{ title: t('tab.dashboard') }} />
          ) : null}
          {user?.tier === 'government' ? (
            <Tabs.Screen name="gov" options={{ title: t('tab.gov') }} />
          ) : null}
          {user?.tier !== 'external' ? (
            <Tabs.Screen name="registers" options={{ title: t('tab.registers') }} />
          ) : null}
          <Tabs.Screen name="inquiries" options={{ title: t('tab.inquiries') }} />
          <Tabs.Screen name="announcements" options={{ title: t('tab.announcements') }} />
          <Tabs.Screen name="events" options={{ title: t('tab.events') }} />
          {user?.tier !== 'external' ? (
            <Tabs.Screen name="modules" options={{ title: t('tab.modules') }} />
          ) : null}
          {user?.tier !== 'external' ? (
            <Tabs.Screen name="health" options={{ title: t('tab.health') }} />
          ) : null}
          {user?.tier !== 'external' ? (
            <Tabs.Screen name="finance" options={{ title: t('finance.titleNew') }} />
          ) : null}
          {user?.tier !== 'external' ? (
            <Tabs.Screen name="hr" options={{ title: t('tab.hr') }} />
          ) : null}
          {user?.tier !== 'external' ? (
            <Tabs.Screen name="reports" options={{ title: t('tab.reports') }} />
          ) : null}
          {user?.tier !== 'external' ? (
            <Tabs.Screen name="ai" options={{ title: t('tab.ai') }} />
          ) : null}
          {user?.tier === 'external' && user?.role === 'family' ? (
            <Tabs.Screen name="family" options={{ title: t('tab.family') }} />
          ) : null}
          {user?.tier === 'external' && user?.role === 'donor' ? (
            <Tabs.Screen name="donor" options={{ title: t('tab.donor') }} />
          ) : null}
          {user?.tier === 'external' && user?.role === 'volunteer' ? (
            <Tabs.Screen name="volunteer" options={{ title: t('tab.volunteer') }} />
          ) : null}
          <Tabs.Screen name="profile" options={{ title: t('tab.profile') }} />
        </Tabs>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  layout: { flex: 1, flexDirection: 'row' },
  content: { flex: 1 },
  hamburger: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  tabBar: {
    width: SIDEBAR_WIDTH,
    borderRightWidth: 1,
  },
  drawerMobile: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    zIndex: 10,
    elevation: 8,
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 4, height: 0 },
  },
  drawerScrim: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 9,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: radii.md,
    borderWidth: 1,
    marginHorizontal: 6,
    marginVertical: 3,
  },
  tabLabel: { fontSize: 9, marginTop: 4, textAlign: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});