import type { TicketPayloadV1 } from '../booking/ticketToken';
import { getTicketSigningSecret, isSupabaseConfigured } from './env';
import { getSupabase } from './supabase';
import { signTicketPayload, verifyTicketToken } from '../booking/ticketToken';

/** Server-signed ticket for a booking (preferred in production). */
export async function issueTicketTokenForBooking(
  bookingId: string,
): Promise<{ ok: true; token: string } | { ok: false; reason: string }> {
  const supabase = getSupabase();
  if (!supabase || !isSupabaseConfigured()) {
    return { ok: false, reason: 'not_configured' };
  }
  const { data, error } = await supabase.functions.invoke('issue-ticket-token', {
    body: { booking_id: bookingId },
  });
  if (error) {
    return { ok: false, reason: error.message || 'issue_failed' };
  }
  const token = typeof data?.token === 'string' ? data.token.trim() : '';
  if (!data?.ok || !token) {
    return { ok: false, reason: String(data?.error ?? 'issue_failed') };
  }
  return { ok: true, token };
}

/** Verify ticket — always via server in release; local secret only in __DEV__. */
export async function verifyTicketTokenForCheckIn(
  token: string,
): Promise<{ ok: true; payload: TicketPayloadV1 } | { ok: false; reason: string }> {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    const localSecret = getTicketSigningSecret();
    if (localSecret.trim()) {
      return verifyTicketToken(token, localSecret);
    }
  }

  const supabase = getSupabase();
  if (!supabase || !isSupabaseConfigured()) {
    return { ok: false, reason: 'not_configured' };
  }

  const { data, error } = await supabase.functions.invoke('verify-ticket-token', {
    body: { token },
  });
  if (error) {
    return { ok: false, reason: error.message || 'verify_failed' };
  }
  if (!data?.ok || !data.payload) {
    return { ok: false, reason: String(data?.reason ?? 'invalid') };
  }
  return { ok: true, payload: data.payload as TicketPayloadV1 };
}

/** Dev-only local signing when Edge Function unavailable. Never used in release builds. */
export async function signTicketPayloadDevFallback(
  payload: TicketPayloadV1,
): Promise<string | null> {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return null;
  const secret = getTicketSigningSecret();
  if (!secret.trim()) return null;
  try {
    return await signTicketPayload(payload, secret);
  } catch {
    return null;
  }
}
