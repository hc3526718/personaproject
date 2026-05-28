import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { openCommunityMessageThread, openEventDetails } from '../navigation/rootNavigationRef';
import { isSupabaseConfigured } from './env';
import { isPushDeliveryEnabled } from './pushPrefsGate';
import { registerDevicePushToken } from '../roadmap/notificationsService';

let notificationResponseListenerAttached = false;

/**
 * Registers Expo push token when `expo-notifications` is installed and permission granted.
 * Safe no-op when package missing (dev without native module).
 */
/** Foreground pushes: show banner/sound/badge; avoids fully silent receipts when logged out/device locked. */
export async function configurePushPresentation(): Promise<void> {
  try {
    const Notifications = await import('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => {
        if (!isPushDeliveryEnabled()) {
          return {
            shouldShowAlert: false,
            shouldShowBanner: false,
            shouldShowList: false,
            shouldPlaySound: false,
            shouldSetBadge: false,
          };
        }
        return {
          shouldShowAlert: true,
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        };
      },
    });
    if (!notificationResponseListenerAttached) {
      notificationResponseListenerAttached = true;
      Notifications.addNotificationResponseReceivedListener((response) => {
        try {
          const data = response.notification.request.content.data as {
            conversationId?: string;
            link_type?: string;
            link_id?: string;
            event_id?: string;
          };
          const lt = (data?.link_type ?? '').toLowerCase();
          const eventId =
            (typeof data?.event_id === 'string' ? data.event_id.trim() : '') ||
            (lt === 'event' && typeof data?.link_id === 'string' ? data.link_id.trim() : '');
          if (eventId) {
            openEventDetails(eventId);
            return;
          }
          const cid =
            typeof data?.conversationId === 'string'
              ? data.conversationId.trim()
              : typeof data?.link_id === 'string'
                ? data.link_id.trim()
                : '';
          if (
            !cid ||
            !(lt === 'conversation' || lt === 'dm' || lt === 'message' || lt.includes('message'))
          )
            return;
          openCommunityMessageThread(cid);
        } catch {
          /* ignore */
        }
      });
    }
  } catch {
    /* expo-notifications optional */
  }
}

export async function tryRegisterPushToken(userId: string): Promise<void> {
  if (!userId || userId.startsWith('demo-') || !isSupabaseConfigured()) return;
  try {
    const Notifications = await import('expo-notifications');
    await configurePushPresentation();
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
