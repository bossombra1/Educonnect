import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const isWeb = Platform.OS === 'web';

export async function getAuthItem(key: string): Promise<string | null> {
  if (isWeb) {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(key);
  }

  return SecureStore.getItemAsync(key);
}

export async function setAuthItem(key: string, value: string): Promise<void> {
  if (isWeb) {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, value);
    }
    return;
  }

  await SecureStore.setItemAsync(key, value);
}

export async function deleteAuthItem(key: string): Promise<void> {
  if (isWeb) {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(key);
    }
    return;
  }

  await SecureStore.deleteItemAsync(key);
}
