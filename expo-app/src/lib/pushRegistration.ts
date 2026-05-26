import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { isSupabaseConfigured } from './env';
import { registerDevicePushToken } from '../roadmap/notificationsService';

/**
 * Registers Expo push token when `expo-notifications` is installed and permission granted.
 * Safe no-op when package missing (dev without native module).
 */
export async function tryRegisterPushToken(userId: string): Promise<void> {
  if (!userId || userId.startsWith('demo-') || !isSupabaseConfigured()) return;
  try {
    const Notifications = await import('expo-notifications');
    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== 'granted') return;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants.expoConfig as { extra?: { easProjectId?: string } })?.extra?.easProjectId;
    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId: String(projectId) } : undefined,
    );
    const token = tokenData.data?.trim();
    if (!token) return;

    const platform =
      Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
    await registerDevicePushToken(userId, token, platform);
  } catch {
    /* expo-notifications not installed or simulator limitation */
  }
}
