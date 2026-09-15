import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { getSupabaseAnonKey, getSupabaseUrl, isSupabaseConfigured } from './env';

const secureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

let client: SupabaseClient | null = null;
let cachedUrl = '';
let cachedKey = '';

/**
 * Shared Supabase client. Null when env is not configured (demo-only mode).
 * Recreates the client if URL/key change (e.g. after Metro loads app config).
 */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    client = null;
    cachedUrl = '';
    cachedKey = '';
    return null;
  }
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  if (client && (cachedUrl !== url || cachedKey !== key)) {
    client = null;
  }
  if (!client) {
    cachedUrl = url;
    cachedKey = key;
    client = createClient(url, key, {
      auth: {
        storage: secureStoreAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}
