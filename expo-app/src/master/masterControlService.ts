import { getMasterDeleteUserEdgeUrl, getSupabaseAnonKey } from '../lib/env';
import { getSupabase } from '../lib/supabase';

export async function verifyMasterPin(pin: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  const { data, error } = await supabase.rpc('verify_master_pin', { pin });
  if (error) return false;
  return data === true;
}

/** Requires deployed Edge Function `master-delete-user` + `SUPABASE_SERVICE_ROLE_KEY` secret. */
export async function masterDeleteUserAccount(
  targetUserId: string,
  pin: string,
): Promise<{ ok: boolean; message?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, message: 'Supabase not configured' };
  const { data: sess } = await supabase.auth.getSession();
  const token = sess.session?.access_token;
  if (!token) return { ok: false, message: 'Not signed in' };
  try {
    const res = await fetch(getMasterDeleteUserEdgeUrl(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: getSupabaseAnonKey(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ target_user_id: targetUserId, pin }),
    });
    const txt = await res.text();
    if (!res.ok) return { ok: false, message: txt || res.statusText };
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'network_error' };
  }
}
