import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_NOTIFY_PREFS,
  IN_APP_NOTIFY_LABELS,
  IN_APP_NOTIFY_PREF_KEYS,
  type InAppNotificationLike,
  type InAppNotifyCategory,
  type InAppNotifyPrefs,
} from './inAppNotifyTypes';
import {
  canAccessInAppNotifyCategory,
  inAppNotifyCategoriesForUser,
} from './notifyPrefsAccess';

export type { InAppNotifyCategory, InAppNotifyPrefs } from './inAppNotifyTypes';
export { DEFAULT_NOTIFY_PREFS, IN_APP_NOTIFY_LABELS } from './inAppNotifyTypes';

const KEY = 'dalton_inapp_notify_prefs';

let prefsCache: InAppNotifyPrefs | null = null;

export async function loadInAppNotifyPrefs(): Promise<InAppNotifyPrefs> {
  if (prefsCache) return { ...prefsCache };
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) {
      prefsCache = { ...DEFAULT_NOTIFY_PREFS };
      return prefsCache;
    }
    const o = JSON.parse(raw) as Record<string, unknown>;
    const out: InAppNotifyPrefs = { ...DEFAULT_NOTIFY_PREFS };

    for (const k of IN_APP_NOTIFY_PREF_KEYS) {
      if (typeof o[k] === 'boolean') {
        out[k] = o[k] as boolean;
      }
    }

    const legacySocial = o.social;
    const legacyEvents = o.events;
    if (typeof legacySocial === 'boolean' && typeof o.postInteraction !== 'boolean') {
      out.postInteraction = legacySocial;
    }
    if (typeof legacyEvents === 'boolean') {
      if (typeof o.eventAttendance !== 'boolean') out.eventAttendance = legacyEvents;
      if (typeof o.eventBooking !== 'boolean') out.eventBooking = legacyEvents;
      if (typeof o.eventCreation !== 'boolean') out.eventCreation = legacyEvents;
    }

    prefsCache = out;
    return out;
  } catch {
    return { ...DEFAULT_NOTIFY_PREFS };
  }
}

export async function saveInAppNotifyPrefs(prefs: Partial<InAppNotifyPrefs>): Promise<void> {
  const cur = await loadInAppNotifyPrefs();
  const next = { ...cur, ...prefs };
  prefsCache = next;
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
}

export function invalidateInAppNotifyPrefsCache(): void {
  prefsCache = null;
}

/** Whether an in-app banner should surface for this category (respects master-only gates). */
export function isInAppBannerAllowed(
  category: InAppNotifyCategory,
  prefs: InAppNotifyPrefs,
  isMaster: boolean,
): boolean {
  if (!prefs.enabled) return false;
  if (!canAccessInAppNotifyCategory(category, isMaster)) return false;
  return prefs[category] !== false;
}

export function sanitizeInAppPrefsForAccount(
  prefs: InAppNotifyPrefs,
  isMaster: boolean,
): InAppNotifyPrefs {
  const allowed = new Set(inAppNotifyCategoriesForUser(isMaster));
  const out: InAppNotifyPrefs = { ...DEFAULT_NOTIFY_PREFS, ...prefs };
  for (const key of IN_APP_NOTIFY_PREF_KEYS) {
    if (key === 'enabled') continue;
    if (!allowed.has(key as InAppNotifyCategory)) {
      out[key] = false;
    }
  }
  return out;
}

/** Rough bucket for dropdown filtering until DB adds a typed `notification_kind` column. */
export function classifyInAppNotification(n: InAppNotificationLike): InAppNotifyCategory {
  const t = `${n.title} ${n.body}`.toLowerCase();

  if (
    /\b(upload|published your|new clip|new video|media)\b/i.test(t) &&
    /\b(media|video|clip|episode)\b/i.test(t)
  ) {
    return 'mediaCreation';
  }
  if (/\b(hosted|you created an event|event created|new event)\b/i.test(t)) {
    return 'eventCreation';
  }
  if (/\b(book|reserved|booking|spot)\b/i.test(t) || /\bpayment\b.*\bevent\b/i.test(t)) {
    return 'eventBooking';
  }
  if (
    /\b(check(?:\s*-?in)?|checked in|attendance|confirmed at gate|gate)\b/i.test(t)
  ) {
    return 'eventAttendance';
  }
  if (
    /\b(message|direct message|\bdm\b|chat)\b/i.test(t) ||
    /\bré?plied\b/i.test(t)
  ) {
    return 'messages';
  }
  if (
    /\b(like|comment|follow|mentioned|@)\b/i.test(t) ||
    /\bhashtag\b/i.test(t)
  ) {
    return 'postInteraction';
  }
  if (/\b(proposal|sponsorship|master review|master intake)\b/i.test(t)) {
    return 'masterProposals';
  }

  return 'system';
}
