import { getSupabase } from '../lib/supabase';
import { getSupabaseAnonKey, getSupabaseUrl } from '../lib/env';
import type { TicketPayloadV1 } from './ticketToken';

export type ServerTicketVerifyResult =
  | { ok: true; payload: TicketPayloadV1 }
  | { ok: false; reason: string };

/** Verify a Wallet/QR ticket token using Edge Function `verify-ticket-token` (server HMAC). */
export async function verifyTicketTokenOnServer(token: string): Promise<ServerTicketVerifyResult> {
  const supabase = getSupabase();
  if (!supabase) {
    return { ok: false, reason: 'Supabase is not configured.' };
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const access = sessionData.session?.access_token;
  if (!access) {
    return { ok: false, reason: 'Sign in as a host to verify tickets.' };
  }

  const url = `${getSupabaseUrl().replace(/\/$/, '')}/functions/v1/verify-ticket-token`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${access}`,
        apikey: getSupabaseAnonKey(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });
  } catch {
    return { ok: false, reason: 'Network error verifying ticket.' };
  }

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const j = (await res.json()) as { error?: string };
      if (j.error) detail = j.error;
    } catch {
      /* ignore */
    }
    return { ok: false, reason: detail };
  }

  const body = (await res.json()) as
    | { ok: true; payload: TicketPayloadV1 }
    | { ok: false; reason: string };
  if (!body.ok) {
    return { ok: false, reason: body.reason || 'invalid' };
  }
  return { ok: true, payload: body.payload };
}

export type HostCheckInResult = {
  ok: boolean;
  already_checked_in?: boolean;
  user_id?: string;
  event_id?: string;
  title?: string;
  reason?: string;
};

/** Record attendance via RPC `host_check_in_booking` (host must own the event). */
export async function hostCheckInByReference(reference: string): Promise<HostCheckInResult> {
  const supabase = getSupabase();
  if (!supabase) {
    return { ok: false, reason: 'supabase_not_configured' };
  }

  const { data, error } = await supabase.rpc('host_check_in_booking', {
    p_reference: reference.trim(),
  });

  if (error) {
    return { ok: false, reason: error.message };
  }

  const row = (data ?? {}) as HostCheckInResult;
  return {
    ok: Boolean(row.ok),
    already_checked_in: row.already_checked_in,
    user_id: row.user_id,
    event_id: row.event_id,
    title: row.title,
    reason: row.reason,
  };
}

/** Prefer server-issued QR token; falls back to null so UI can use local demo signing. */
export async function issueTicketTokenFromServer(
  bookingId: string,
): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase || !bookingId) return null;

  const { data: sessionData } = await supabase.auth.getSession();
  const access = sessionData.session?.access_token;
  if (!access) return null;

  const url = `${getSupabaseUrl().replace(/\/$/, '')}/functions/v1/issue-ticket-token`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${access}`,
        apikey: getSupabaseAnonKey(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ booking_id: bookingId }),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { ok?: boolean; token?: string };
    return j.ok && j.token ? j.token : null;
  } catch {
    return null;
  }
}
