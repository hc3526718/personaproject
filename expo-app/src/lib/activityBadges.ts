import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupabase, isSupabaseConfigured } from './supabase';
import { listInAppNotifications } from '../roadmap/notificationsService';
import { listConversationSummaries } from '../roadmap/messagingService';

const LAST_SEEN_KEY = 'dalton_activity_last_seen_v1';

export type ActivitySnapshot = {
  unreadNotifications: number;
  unreadMessages: number;
};

export type ActivityLastSeen = {
  notificationsAt: string | null;
  messagesAt: string | null;
};

export async function loadActivityLastSeen(): Promise<ActivityLastSeen> {
  try {
    const raw = await AsyncStorage.getItem(LAST_SEEN_KEY);
    if (!raw) return { notificationsAt: null, messagesAt: null };
    const parsed = JSON.parse(raw) as ActivityLastSeen;
    return {
      notificationsAt: parsed.notificationsAt ?? null,
      messagesAt: parsed.messagesAt ?? null,
    };
  } catch {
    return { notificationsAt: null, messagesAt: null };
  }
}

export async function saveActivityLastSeen(patch: Partial<ActivityLastSeen>): Promise<void> {
  const prev = await loadActivityLastSeen();
  const next = { ...prev, ...patch };
  await AsyncStorage.setItem(LAST_SEEN_KEY, JSON.stringify(next));
}

export async function fetchActivitySnapshot(userId: string): Promise<ActivitySnapshot> {
  if (!userId || userId.startsWith('demo-') || !isSupabaseConfigured()) {
    return { unreadNotifications: 0, unreadMessages: 0 };
  }
  const [notifs, convos] = await Promise.all([
    listInAppNotifications(userId, 80),
    listConversationSummaries(userId),
  ]);
  const unreadNotifications = notifs.filter((n) => !n.read_at).length;
  const lastSeen = await loadActivityLastSeen();
  const messagesSince = lastSeen.messagesAt ? Date.parse(lastSeen.messagesAt) : 0;
  const unreadMessages = convos.filter((c) => {
    if (!c.last_at) return false;
    const ts = Date.parse(c.last_at);
    return ts > messagesSince;
  }).length;
  return { unreadNotifications, unreadMessages };
}

/** Call when user opens notifications list — clears notification badge. */
export async function markNotificationsSeen(): Promise<void> {
  await saveActivityLastSeen({ notificationsAt: new Date().toISOString() });
}

/** Call when user opens messages inbox — clears message badge. */
export async function markMessagesSeen(): Promise<void> {
  await saveActivityLastSeen({ messagesAt: new Date().toISOString() });
}
