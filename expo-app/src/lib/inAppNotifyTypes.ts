/** Shared in-app notification prefs types (no runtime imports — breaks notifyPrefs cycle). */

/** Minimal shape for classifying notifications without importing notificationsService. */
export type InAppNotificationLike = {
  title: string;
  body: string;
  link_type?: string | null;
};

export type InAppNotifyPrefs = {
  /** Master toggle for dropdown / banners */
  enabled: boolean;
  /** Likes, comments, follows, @mentions */
  postInteraction: boolean;
  messages: boolean;
  eventAttendance: boolean;
  eventBooking: boolean;
  eventCreation: boolean;
  mediaCreation: boolean;
  /** Master accounts: incoming proposals */
  masterProposals: boolean;
  system: boolean;
};

export type InAppNotifyCategory = keyof Omit<InAppNotifyPrefs, 'enabled'>;

export const IN_APP_NOTIFY_LABELS: Record<InAppNotifyCategory, string> = {
  postInteraction: 'Post interactions',
  messages: 'Messages',
  eventAttendance: 'Event attendance',
  eventBooking: 'Event booking',
  eventCreation: 'Event creation',
  mediaCreation: 'Media creation',
  masterProposals: 'Master proposals',
  system: 'System & other',
};

export const DEFAULT_NOTIFY_PREFS: InAppNotifyPrefs = {
  enabled: true,
  postInteraction: true,
  messages: true,
  eventAttendance: true,
  eventBooking: true,
  eventCreation: true,
  mediaCreation: true,
  masterProposals: true,
  system: true,
};

export const IN_APP_NOTIFY_PREF_KEYS: (keyof InAppNotifyPrefs)[] = [
  'enabled',
  'postInteraction',
  'messages',
  'eventAttendance',
  'eventBooking',
  'eventCreation',
  'mediaCreation',
  'masterProposals',
  'system',
];
