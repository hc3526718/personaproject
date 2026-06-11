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
 * Never overwrites an existing display name — login must not wipe Google/OAuth full names.
 */
export async function ensureProfileRow(userId: string, emailHint: string | null): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const display = emailHint?.split('@')[0]?.trim() || 'Member';
  await supabase.from('profiles').upsert(
    { id: userId, display_name: display },
    { onConflict: 'id', ignoreDuplicates: true },
  );
}

/** Fill display / first / last from OAuth metadata when the profile row is still blank. */
export async function syncProfileDisplayNameFromAuth(
  userId: string,
  userMetadata: Record<string, unknown> | undefined,
  email: string | null,
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const { data: prof } = await supabase
    .from('profiles')
    .select('display_name, first_name, last_name')
    .eq('id', userId)
    .maybeSingle();
  if (prof?.display_name?.trim()) return;

  const full = typeof userMetadata?.full_name === 'string' ? userMetadata.full_name.trim() : '';
  const given = typeof userMetadata?.given_name === 'string' ? userMetadata.given_name.trim() : '';
  const family = typeof userMetadata?.family_name === 'string' ? userMetadata.family_name.trim() : '';

  let display = full;
  let first = given;
  let last = family;
  if (!display && (given || family)) {
    display = [given, family].filter(Boolean).join(' ');
  }
  if (!display) {
    display = email?.split('@')[0]?.trim() || '';
  }
  if (!display) return;

  if (!first || !last) {
    const parts = full.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      if (!first) first = parts[0] ?? '';
      if (!last) last = parts.slice(1).join(' ');
    }
  }

  const patch: Record<string, string> = { display_name: display };
  if (!prof?.first_name?.trim() && first) patch.first_name = first;
  if (!prof?.last_name?.trim() && last) patch.last_name = last;
  await supabase.from('profiles').update(patch).eq('id', userId);
}

export function profileDisplayName(
  profile: Pick<ProfileRow, 'display_name' | 'first_name' | 'last_name' | 'username'> | null | undefined,
): string {
  const d = profile?.display_name?.trim();
  if (d) return d;
  const parts = [profile?.first_name?.trim(), profile?.last_name?.trim()].filter(Boolean);
  if (parts.length > 0) return parts.join(' ');
  const u = profile?.username?.trim();
  if (u) return u;
  return '';
}

/** Persist the name entered at event registration when the profile is still generic. */
export async function saveAttendeeNameFromBooking(userId: string, fullName: string): Promise<void> {
  const trimmed = fullName.trim();
  if (!trimmed || trimmed.length < 2) return;
  const supabase = getSupabase();
  if (!supabase) return;
  const { data: prof } = await supabase
    .from('profiles')
    .select('display_name, first_name, last_name')
    .eq('id', userId)
    .maybeSingle();

  const parts = trimmed.split(/\s+/).filter(Boolean);
  const first = parts[0] ?? '';
  const last = parts.length > 1 ? parts.slice(1).join(' ') : '';
  const patch: Record<string, string> = {};
  if (!prof?.display_name?.trim()) patch.display_name = trimmed;
  if (!prof?.first_name?.trim() && first) patch.first_name = first;
  if (!prof?.last_name?.trim() && last) patch.last_name = last;
  if (Object.keys(patch).length === 0) return;
  await supabase.from('profiles').update(patch).eq('id', userId);
}

export async function updateProfileBasics(
  userId: string,
  patch: {
    first_name: string;
    last_name: string;
    display_name: string;
    username: string;
    sports: string[];
  },
): Promise<{ ok: true; profile: ProfileRow } | { ok: false; error: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: 'Not connected.' };
  const { data, error } = await supabase
    .from('profiles')
    .update({
      first_name: patch.first_name,
      last_name: patch.last_name,
      display_name: patch.display_name,
      username: patch.username,
      sports: patch.sports,
    })
    .eq('id', userId)
    .select('*')
    .single();
  if (error || !data) {
    return { ok: false, error: error?.message ?? 'Could not save profile.' };
  }
  return { ok: true, profile: data as ProfileRow };
}

export type AthleteDetails = {
  discipline: string;
  level: string;
  team: string;
  coach: string;
  badges: Record<string, boolean>;
};

export async function updateProfileAthleteDetails(
  userId: string,
  details: AthleteDetails,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: 'Not connected.' };
  const { error } = await supabase
    .from('profiles')
    .update({
      athlete_details: details,
      primary_sport: details.discipline.trim() || null,
    })
    .eq('id', userId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function updateProfileAllowMessagesFrom(
  userId: string,
  value: 'everyone' | 'followers_only' | 'friends_only',
): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  const { error } = await supabase
    .from('profiles')
    .update({ allow_messages_from: value })
    .eq('id', userId);
  return !error;
}
