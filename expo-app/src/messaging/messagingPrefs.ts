/**
 * Who can start a DM with the current user (aligned with `profiles.allow_messages_from` in the backend).
 */
export type AllowMessagesFrom = 'everyone' | 'followers_only' | 'friends_only';

let allowMessagesFrom: AllowMessagesFrom = 'everyone';

export function getAllowMessagesFrom(): AllowMessagesFrom {
  return allowMessagesFrom;
}

export function setAllowMessagesFrom(value: AllowMessagesFrom): void {
  allowMessagesFrom = value;
}

/** Follow requests inbox is only used when DMs are restricted (not community post visibility). */
export function requiresFollowRequestInbox(policy: AllowMessagesFrom): boolean {
  return policy !== 'everyone';
}
