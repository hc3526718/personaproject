import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PREFIX = 'dalton_app_welcome_tour_v1_';

function keyForUser(userId: string): string {
  return `${KEY_PREFIX}${userId}`;
}

export async function hasCompletedAppWelcomeTour(userId: string): Promise<boolean> {
  if (!userId) return true;
  try {
    const raw = await AsyncStorage.getItem(keyForUser(userId));
    return raw === '1';
  } catch {
    return false;
  }
}

export async function markAppWelcomeTourCompleted(userId: string): Promise<void> {
  if (!userId) return;
  try {
    await AsyncStorage.setItem(keyForUser(userId), '1');
  } catch {
    /* non-fatal */
  }
}
