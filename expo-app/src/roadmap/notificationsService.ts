import { getSupabase } from '../lib/supabase';
import type { PushDeviceRow } from './types';

/** Persist Expo push token for targeted notifications (requires `device_push_tokens` table — see SQL stub). */
export async function registerDevicePushToken(
  userId: string,
  expoPushToken: string,
  platform: PushDeviceRow['platform'],
): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  const { error } = await supabase.from('device_push_tokens').upsert(
    {
      user_id: userId,
      expo_push_token: expoPushToken,
      platform,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
  return !error;
}

export type InAppNotification = { id: string; title: string; body: string; read_at: string | null; created_at: string };

/** Placeholder until `notifications` / `user_notifications` table exists. */
export async function listInAppNotifications(_userId: string): Promise<InAppNotification[]> {
  return [];
}
