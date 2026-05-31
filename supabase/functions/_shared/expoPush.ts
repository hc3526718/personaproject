export type NotificationChannels = {
  push?: boolean;
  email?: boolean;
  event_reminders?: boolean;
  community_mentions?: boolean;
  master_proposals?: boolean;
};

export type InAppNotifyPrefs = {
  enabled?: boolean;
  postInteraction?: boolean;
  messages?: boolean;
  eventAttendance?: boolean;
  eventBooking?: boolean;
  eventCreation?: boolean;
  mediaCreation?: boolean;
  masterProposals?: boolean;
  system?: boolean;
};

export function classifyNotificationCategory(
  title: string,
  body: string,
  linkType: string | null,
): string {
  const t = `${title} ${body}`.toLowerCase();
  const lt = (linkType ?? '').toLowerCase();

  if (lt === 'conversation' || lt === 'dm' || lt === 'message') return 'messages';
  if (t.includes('new message') || t.includes('messaged')) return 'messages';

  if (lt === 'proposal_outcome' || lt === 'proposal' || lt === 'content_proposal') {
    return 'masterProposals';
  }
  if (/^new (sponsorship|event|media) proposal\b/.test(t)) return 'masterProposals';

  if (lt === 'event' || t.includes('event updated')) return 'eventAttendance';
  if (/\b(book|reserved|booking|spot)\b/.test(t)) return 'eventBooking';
  if (/\b(hosted|you created an event|event created|new event)\b/.test(t)) {
    return 'eventCreation';
  }
  if (/\b(check(?:\s*-?in)?|checked in|attendance)\b/.test(t)) return 'eventAttendance';
  if (/\b(upload|published your|new clip|media)\b/.test(t)) return 'mediaCreation';
  if (/\b(like|comment|follow|mentioned|@)\b/.test(t)) return 'postInteraction';

  return 'system';
}

export function shouldSendExpoPush(opts: {
  channels: NotificationChannels;
  inApp: InAppNotifyPrefs | undefined;
  category: string;
  isMaster: boolean;
}): boolean {
  const { channels, inApp, category, isMaster } = opts;
  if (channels.push === false) return false;

  if (inApp?.enabled === false) return false;

  const catOn = (key: keyof InAppNotifyPrefs): boolean => inApp?.[key] !== false;

  switch (category) {
    case 'messages':
      return catOn('messages');
    case 'eventAttendance':
      return channels.event_reminders !== false && catOn('eventAttendance');
    case 'eventBooking':
      return channels.event_reminders !== false && catOn('eventBooking');
    case 'eventCreation':
      return channels.event_reminders !== false && catOn('eventCreation');
    case 'mediaCreation':
      return catOn('mediaCreation');
    case 'postInteraction':
      return channels.community_mentions === true && catOn('postInteraction');
    case 'masterProposals':
      if (!isMaster) return false;
      return channels.master_proposals !== false && catOn('masterProposals');
    default:
      return catOn('system');
  }
}

export async function sendExpoPush(
  token: string,
  payload: { title: string; body: string; data?: Record<string, string> },
): Promise<boolean> {
  if (!token.startsWith('ExponentPushToken')) return false;
  try {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: token,
        title: payload.title,
        body: payload.body,
        data: payload.data ?? {},
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
