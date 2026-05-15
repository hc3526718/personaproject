import { getSupabase } from '../lib/supabase';

/** Stored in `user_settings.preferences` (JSON). */
export type UserPrefsDoc = {
  privacy?: {
    profile_public?: boolean;
    show_recent_results?: boolean;
    partner_analytics?: boolean;
  };
  notification_channels?: {
    push?: boolean;
    email?: boolean;
    event_reminders?: boolean;
    community_mentions?: boolean;
  };
};

export const DEFAULT_USER_PREFS: UserPrefsDoc = {
  privacy: {
    profile_public: true,
    show_recent_results: true,
    partner_analytics: false,
  },
  notification_channels: {
    push: true,
    email: true,
    event_reminders: true,
    community_mentions: false,
  },
};

function mergePrefs(base: UserPrefsDoc, patch: Partial<UserPrefsDoc>): UserPrefsDoc {
  return {
    privacy: { ...base.privacy, ...patch.privacy },
    notification_channels: { ...base.notification_channels, ...patch.notification_channels },
  };
}

const RETRY_MS = [300, 1200, 2800];

async function upsertWithRetry(userId: string, preferences: Record<string, unknown>): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  for (let attempt = 0; attempt <= RETRY_MS.length; attempt++) {
    const { error } = await supabase.from('user_settings').upsert(
      {
        user_id: userId,
        preferences,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );
    if (!error) return true;
    const wait = RETRY_MS[attempt];
    if (wait == null) break;
    await new Promise((r) => setTimeout(r, wait));
  }
  return false;
}

/** Load merged preferences doc (defaults + stored JSON). */
export async function fetchUserPrefsDoc(userId: string): Promise<UserPrefsDoc> {
  const supabase = getSupabase();
  if (!supabase) return { ...DEFAULT_USER_PREFS };
  const { data, error } = await supabase
    .from('user_settings')
    .select('preferences')
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data) return { ...DEFAULT_USER_PREFS };
  const raw = (data as { preferences: unknown }).preferences;
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_USER_PREFS };
  const p = raw as Record<string, unknown>;
  const privacy = (p.privacy as UserPrefsDoc['privacy']) ?? {};
  const notification_channels = (p.notification_channels as UserPrefsDoc['notification_channels']) ?? {};
  return mergePrefs(DEFAULT_USER_PREFS, { privacy, notification_channels });
}

/** Merge a partial patch, persist with retries. Fetches current row first so nested keys are not dropped. */
export async function patchUserPrefsDoc(userId: string, patch: Partial<UserPrefsDoc>): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  const { data } = await supabase.from('user_settings').select('preferences').eq('user_id', userId).maybeSingle();
  let base: UserPrefsDoc = { ...DEFAULT_USER_PREFS };
  if (data && typeof (data as { preferences: unknown }).preferences === 'object') {
    const raw = (data as { preferences: Record<string, unknown> }).preferences;
    const privacy = (raw.privacy as UserPrefsDoc['privacy']) ?? {};
    const notification_channels =
      (raw.notification_channels as UserPrefsDoc['notification_channels']) ?? {};
    base = mergePrefs(DEFAULT_USER_PREFS, { privacy, notification_channels });
  }
  const merged = mergePrefs(base, patch);
  return upsertWithRetry(userId, merged as unknown as Record<string, unknown>);
}
