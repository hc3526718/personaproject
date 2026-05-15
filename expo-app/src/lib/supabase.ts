import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { getSupabaseAnonKey, getSupabaseUrl, isSupabaseConfigured } from './env';
import { supabaseAuthStorage } from './supabaseAuthStorage';

const isWeb = Platform.OS === 'web';

let client: SupabaseClient | null = null;
let cachedUrl = '';
let cachedKey = '';

/**
 * Shared Supabase client. Null when URL/key env is not configured.
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
        storage: supabaseAuthStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: isWeb,
        flowType: 'pkce',
      },
    });
  }
  return client;
}
