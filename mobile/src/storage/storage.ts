import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER: 'auth_user',
  MESSAGES_CACHE: 'messages_cache',
  MESSAGES_LAST_SYNC: 'messages_last_sync',
  ONBOARDING_DONE: 'onboarding_done',
  FCM_TOKEN: 'fcm_token',
  PENDING_READ_RECEIPTS: 'pending_read_receipts',
} as const;

class StorageService {
  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await AsyncStorage.getItem(key);
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown): Promise<void> {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  }

  async remove(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  }

  async clear(): Promise<void> {
    await AsyncStorage.clear();
  }
}

export const storage = new StorageService();
export default storage;
