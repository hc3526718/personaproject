import { getDeleteOwnAccountEdgeUrl, getSupabaseAnonKey } from '../lib/env';
import { coerceApiError } from '../lib/appAlert';

export type DeleteOwnAccountResult =
  | { ok: true; stripeSubscriptionsScheduled?: string[] }
  | { ok: false; message: string };

/** Permanently deletes the signed-in user (requires confirm phrase DELETE). */
export async function deleteOwnAccount(
  accessToken: string,
  confirmPhrase: string,
): Promise<DeleteOwnAccountResult> {
  const url = getDeleteOwnAccountEdgeUrl();
  const anon = getSupabaseAnonKey();
  if (!url || !anon) {
    return { ok: false, message: 'Account deletion is not configured.' };
  }
  if (confirmPhrase.trim().toUpperCase() !== 'DELETE') {
    return { ok: false, message: 'Type DELETE to confirm.' };
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: anon,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ confirm_phrase: confirmPhrase.trim() }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      error?: string;
      ok?: boolean;
      stripe_subscriptions_scheduled?: string[];
    };
    if (!res.ok) {
      return {
        ok: false,
        message: coerceApiError('delete your account', json.error ?? `Request failed (${res.status})`),
      };
    }
    const scheduled = Array.isArray(json.stripe_subscriptions_scheduled)
      ? json.stripe_subscriptions_scheduled.filter((id): id is string => typeof id === 'string')
      : undefined;
    return { ok: true, stripeSubscriptionsScheduled: scheduled };
  } catch (e) {
    return {
      ok: false,
      message: coerceApiError('delete your account', e instanceof Error ? e.message : undefined),
    };
  }
}
