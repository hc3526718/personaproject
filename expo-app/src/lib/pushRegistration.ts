import { InteractionManager, Linking, Platform } from 'react-native';
import Constants from 'expo-constants';
import { openCommunityMessageThread, openEventDetails } from '../navigation/rootNavigationRef';
import { isSupabaseConfigured } from './env';
import { isPushDeliveryEnabled } from './pushPrefsGate';
import { fetchUserPrefsDoc } from '../roadmap/userSettingsService';
import { registerDevicePushToken, unregisterDevicePushToken } from '../roadmap/notificationsService';

let notificationResponseListenerAttached = false;
let androidChannelReady = false;

export type PushPermissionStatus = 'granted' | 'denied' | 'undetermined' | 'unavailable';

export type PushPermissionSnapshot = {
  status: PushPermissionStatus;
  canAskAgain: boolean;
};

function pushDebug(step: string, detail?: unknown): void {
  if (!__DEV__) return;
  if (detail !== undefined) {
    console.log(`[push] ${step}`, detail);
  } else {
    console.log(`[push] ${step}`);
  }
}

async function loadNotificationsModule() {
  return import('expo-notifications');
}

export async function ensureAndroidNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android' || androidChannelReady) return;
  try {
    const Notifications = await loadNotificationsModule();
    await Notifications.setNotificationChannelAsync('default', {
      name: 'The Dalton Grant Academy',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#C8A84B',
    });
    androidChannelReady = true;
  } catch (err) {
    pushDebug('android channel setup failed', err);
  }
}

export async function getPushPermissionSnapshot(): Promise<PushPermissionSnapshot> {
  try {
    const Notifications = await loadNotificationsModule();
    const settings = await Notifications.getPermissionsAsync();
    const status = settings.status as PushPermissionStatus;
    return {
      status: status === 'granted' || status === 'denied' || status === 'undetermined' ? status : 'unavailable',
      canAskAgain: settings.canAskAgain !== false,
    };
  } catch {
    return { status: 'unavailable', canAskAgain: false };
  }
}

/** System permission dialog — call after sign-in or from Settings → Notifications. */
export async function requestPushPermissions(): Promise<PushPermissionSnapshot> {
  try {
    const Notifications = await loadNotificationsModule();
    await ensureAndroidNotificationChannel();
    const result = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });
    pushDebug('permission (after explicit request)', result.status);
    const status = result.status as PushPermissionStatus;
    return {
      status: status === 'granted' || status === 'denied' || status === 'undetermined' ? status : 'unavailable',
      canAskAgain: result.canAskAgain !== false,
    };
  } catch (err) {
    pushDebug('requestPushPermissions failed', err);
    return { status: 'unavailable', canAskAgain: false };
  }
}

export function openDeviceNotificationSettings(): void {
  void Linking.openSettings();
}

/** Foreground pushes: show banner/sound/badge; avoids fully silent receipts when logged out/device locked. */
export async function configurePushPresentation(): Promise<void> {
  try {
    const Notifications = await loadNotificationsModule();
    await ensureAndroidNotificationChannel();
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
  if (!userId || userId.startsWith('demo-')) {
    pushDebug('skip: no user or demo account');
    return;
  }
  if (!isSupabaseConfigured()) {
    pushDebug('skip: Supabase not configured in .env');
    return;
  }
  try {
    const doc = await fetchUserPrefsDoc(userId);
    if (doc.notification_channels?.push === false) {
      pushDebug('skip: push disabled in user prefs');
      setPushDeliveryEnabled(false);
      await unregisterDevicePushToken(userId);
      return;
    }
    setPushDeliveryEnabled(true);

    const Notifications = await loadNotificationsModule();
    await configurePushPresentation();
    let snapshot = await getPushPermissionSnapshot();
    pushDebug('permission (before request)', snapshot.status);
    if (snapshot.status !== 'granted') {
      snapshot = await requestPushPermissions();
    }
    if (snapshot.status !== 'granted') {
      pushDebug(
        'not granted — open Settings → Notifications → The Dalton Grant Academy, or use Enable on Settings → Notifications in the app',
      );
      return;
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants.expoConfig as { extra?: { easProjectId?: string } })?.extra?.easProjectId;
    if (!projectId) {
      pushDebug('missing EAS projectId in app.config extra.eas.projectId');
      return;
    }
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId: String(projectId) });
    const token = tokenData.data?.trim();
    if (!token) {
      pushDebug('getExpoPushTokenAsync returned empty (simulator or missing push entitlement?)');
      return;
    }

    const platform =
      Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
    const saved = await registerDevicePushToken(userId, token, platform);
    pushDebug(saved ? 'token saved to Supabase' : 'token save failed (RLS or device_push_tokens)', {
      platform,
      tokenPrefix: token.slice(0, 24),
    });
  } catch (err) {
    pushDebug(
      'registration failed — rebuild dev client after adding expo-notifications plugin',
      err,
    );
  }
}

/** Defer push registration until navigation transitions finish (iOS is more reliable). */
export function schedulePushRegistration(userId: string): void {
  InteractionManager.runAfterInteractions(() => {
    void tryRegisterPushToken(userId);
  });
}
