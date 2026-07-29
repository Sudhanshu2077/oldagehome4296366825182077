import { Platform } from 'react-native';

const PREFIX = 'igohms.';

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return globalThis.localStorage?.getItem(PREFIX + key) ?? null;
  }
  const SecureStore = await import('expo-secure-store');
  return SecureStore.getItemAsync(PREFIX + key);
}

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(PREFIX + key, value);
    return;
  }
  const SecureStore = await import('expo-secure-store');
  await SecureStore.setItemAsync(PREFIX + key, value);
}

async function deleteItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.removeItem(PREFIX + key);
    return;
  }
  const SecureStore = await import('expo-secure-store');
  await SecureStore.deleteItemAsync(PREFIX + key);
}

export const tokenStorage = { getItem, setItem, deleteItem };
