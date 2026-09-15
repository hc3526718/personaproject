import { Platform } from 'react-native';
import { cacheDirectory, EncodingType, writeAsStringAsync } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { getSupabase } from '../lib/supabase';
import { getSupabaseAnonKey, getSupabaseUrl } from '../lib/env';

export type WalletPassRequest = {
  bookingId?: string;
  reference?: string;
};

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/**
 * Download a signed Apple Wallet .pkpass from Supabase Edge Function `wallet-generate-pass`
 * and open the iOS share sheet so the user can Add to Wallet.
 */
export async function downloadAndShareWalletPass(
  req: WalletPassRequest,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (Platform.OS !== 'ios') {
    return { ok: false, reason: 'Apple Wallet passes are only available on iOS.' };
  }
  if (!req.bookingId && !req.reference) {
    return { ok: false, reason: 'Missing booking id or reference.' };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { ok: false, reason: 'Supabase is not configured.' };
  }

  const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (sessionErr || !token) {
    return { ok: false, reason: 'Sign in to add this booking to Apple Wallet.' };
  }

  const url = `${getSupabaseUrl().replace(/\/$/, '')}/functions/v1/wallet-generate-pass`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: getSupabaseAnonKey(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...(req.bookingId ? { bookingId: req.bookingId } : {}),
        ...(req.reference ? { reference: req.reference } : {}),
      }),
    });
  } catch {
    return { ok: false, reason: 'Network error talking to wallet service.' };
  }

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const j = (await res.json()) as { message?: string; error?: string; stage?: string };
      detail = j.message || j.error || detail;
      if (j.stage) detail = `${detail} (${j.stage})`;
    } catch {
      /* ignore */
    }
    return { ok: false, reason: detail };
  }

  const buf = await res.arrayBuffer();
  if (!buf.byteLength) {
    return { ok: false, reason: 'Empty pass file from server.' };
  }

  const dir = cacheDirectory;
  if (!dir) {
    return { ok: false, reason: 'No cache directory available on device.' };
  }

  const safeRef = (req.reference || req.bookingId || 'ticket').replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileUri = `${dir}event-${safeRef}.pkpass`;
  await writeAsStringAsync(fileUri, arrayBufferToBase64(buf), {
    encoding: EncodingType.Base64,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    return { ok: false, reason: 'Sharing is not available on this device.' };
  }

  await Sharing.shareAsync(fileUri, {
    mimeType: 'application/vnd.apple.pkpass',
    UTI: 'com.apple.pkpass',
    dialogTitle: 'Add to Apple Wallet',
  });

  return { ok: true };
}
