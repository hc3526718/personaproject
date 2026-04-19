import { getSupabase } from '../lib/supabase';
import type { ProfileRow } from './types';

/**
 * Load the signed-in user’s profile row (call after `getSession` / `onAuthStateChange`).
 * Wire into `AuthProvider` when you want onboarding + display name hydrated from DB.
 */
export async function fetchProfileByUserId(userId: string): Promise<ProfileRow | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error || !data) return null;
  return data as ProfileRow;
}

/**
 * Ensure profile exists after OAuth / email sign-up (server trigger preferred; this is a client fallback).
 */
export async function ensureProfileRow(userId: string, emailHint: string | null): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const display = emailHint?.split('@')[0]?.trim() || 'Member';
  await supabase.from('profiles').upsert(
    { id: userId, display_name: display },
    { onConflict: 'id' },
  );
}
