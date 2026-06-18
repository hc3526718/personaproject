import AsyncStorage from '@react-native-async-storage/async-storage';
import { isSupabaseConfigured } from '../lib/env';
import { fetchUserPrefsDoc, patchUserPrefsDoc } from '../roadmap/userSettingsService';

const KEY_PREFIX = 'dalton_app_welcome_tour_v1_';

function keyForUser(userId: string): string {
  return `${KEY_PREFIX}${userId}`;
}

async function readLocalFlag(userId: string): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(keyForUser(userId));
    return raw === '1';
  } catch {
    return false;
  }
}

async function writeLocalFlag(userId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(keyForUser(userId), '1');
  } catch {
    /* non-fatal */
  }
}

/** True if this account has already seen the intro tour (any device). */
export async function hasCompletedAppWelcomeTour(userId: string): Promise<boolean> {
  if (!userId) return true;

  if (await readLocalFlag(userId)) return true;

  if (isSupabaseConfigured()) {
    try {
      const doc = await fetchUserPrefsDoc(userId);
      if (doc.app_welcome_tour_completed_at) {
        await writeLocalFlag(userId);
        return true;
      }
    } catch {
      /* fall through */
    }
  }

  return false;
}

/**
 * Record intro tour as seen for this account (skip, complete, or first display).
 * Persists to Supabase `user_settings.preferences` and local cache.
 */
export async function markAppWelcomeTourCompleted(userId: string): Promise<void> {
  if (!userId) return;

  await writeLocalFlag(userId);

  if (!isSupabaseConfigured()) return;

  const at = new Date().toISOString();
  try {
    await patchUserPrefsDoc(userId, { app_welcome_tour_completed_at: at });
  } catch {
    /* local flag still prevents repeat on this device */
  }
}
