import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/**
 * Supabase session persistence.
 * Native uses AsyncStorage — PKCE sessions often exceed SecureStore's 2048-byte limit
 * (which breaks Google/Apple sign-in silently and can crash Hermes).
 */
export const supabaseAuthStorage = {
  getItem: (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      try {
        if (typeof localStorage === 'undefined') return Promise.resolve(null);
        return Promise.resolve(localStorage.getItem(key));
      } catch {
        return Promise.resolve(null);
      }
    }
    return AsyncStorage.getItem(key);
  },
  setItem: (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      try {
        if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
      } catch {
        /* quota / private mode */
      }
      return Promise.resolve();
    }
    return AsyncStorage.setItem(key, value);
  },
  removeItem: (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      try {
        if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
      return Promise.resolve();
    }
    return AsyncStorage.removeItem(key);
  },
};
