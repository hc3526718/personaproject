/**
 * Client helper: download a signed .pkpass and open the Apple Wallet sheet (iOS only).
 */
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform, Alert } from 'react-native';
import {
  canAddAppleWalletPass,
  isAppleWalletPassNativeAvailable,
  presentAppleWalletPassFromBase64,
} from 'apple-wallet-pass';
import { safeGetSession } from '../auth/authSessionRecovery';
import { getSupabase } from './supabase';
import { getSupabaseUrl } from './env';
import { userFacingErrorBody } from './appAlert';

export type WalletPassInput = {
  bookingId: string;
  reference?: string;
};

type WalletPassApiError = {
  error?: string;
  message?: string;
  code?: string;
  stage?: string;
};

const LOG_PREFIX = '[AppleWallet]';
let warnedWalletNativeNotLinked = false;

function logWalletPass(stage: string, detail: Record<string, unknown>): void {
  console.warn(LOG_PREFIX, stage, detail);
}

function logWalletPassError(stage: string, detail: Record<string, unknown>): void {
  console.error(LOG_PREFIX, stage, detail);
}

async function readWalletPassResponseBody(res: Response): Promise<{
  raw: string;
  json: WalletPassApiError | null;
}> {
  const raw = await res.text().catch(() => '');
  if (!raw.trim()) return { raw: '', json: null };
  try {
    return { raw, json: JSON.parse(raw) as WalletPassApiError };
  } catch {
    return { raw, json: null };
  }
}

function walletPassUserMessage(
  status: number,
  parsed: WalletPassApiError | null,
  raw: string,
): string {
  const code = parsed?.error ?? parsed?.code;

  if (code === 'unauthorized' || status === 401) {
    return 'Your session expired. Sign out and sign in again, then retry.';
  }
  if (code === 'booking_not_found' || status === 404) {
    return 'No booking was found for this ticket. Try booking again or reopen the confirmation screen.';
  }
  if (code === 'bookingId or reference required' || status === 400) {
    return 'Missing booking details. Reopen your ticket from My Bookings.';
  }
  if (code === 'not_configured' || status === 503) {
    return 'Apple Wallet is not available for this ticket yet. Contact Support from Profile → Help.';
  }

  return userFacingErrorBody('add this pass to Apple Wallet');
}

function reportWalletPassFailure(
  stage: string,
  detail: Record<string, unknown>,
  alertMessage: string,
): void {
  logWalletPassError(stage, detail);
  Alert.alert('Apple Wallet', alertMessage);
}

export async function addEventPassToAppleWallet(input: WalletPassInput): Promise<void> {
  if (Platform.OS !== 'ios') return;

  const supabase = getSupabase();
  if (!supabase) {
    logWalletPass('blocked', { reason: 'supabase_not_configured' });
    Alert.alert('Wallet unavailable', 'Sign in to add your pass to Apple Wallet.');
    return;
  }

  const session = await safeGetSession(supabase);
  const token = session?.access_token;
  if (!token) {
    logWalletPass('blocked', { reason: 'no_auth_session', bookingId: input.bookingId });
    Alert.alert('Wallet unavailable', 'Sign in to add your pass to Apple Wallet.');
    return;
  }

  const base = getSupabaseUrl()?.replace(/\/$/, '');
  if (!base) {
    logWalletPass('blocked', { reason: 'missing_supabase_url' });
    Alert.alert('Wallet unavailable', 'Server URL is not configured.');
    return;
  }

  const url = `${base}/functions/v1/wallet-generate-pass`;
  const payload = { bookingId: input.bookingId, reference: input.reference };

  logWalletPass('request', {
    url,
    bookingId: input.bookingId,
    reference: input.reference ?? null,
    hasToken: Boolean(token),
  });

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const { raw, json } = await readWalletPassResponseBody(res);
      const userMessage = walletPassUserMessage(res.status, json, raw);
      reportWalletPassFailure(
        'generate_pass_http_error',
        {
          status: res.status,
          statusText: res.statusText,
          url,
          request: payload,
          responseJson: json,
          responseRaw: raw.slice(0, 500),
          userMessage,
        },
        userMessage,
      );
      return;
    }

    const contentType = res.headers.get('content-type') ?? '';
    if (contentType.includes('application/vnd.apple.pkpass')) {
      const buf = await res.arrayBuffer();
      if (buf.byteLength === 0) {
        reportWalletPassFailure(
          'empty_pkpass_body',
          { status: res.status, contentType, bookingId: input.bookingId },
          'Server returned an empty pass file.',
        );
        return;
      }
      const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
      const passPath = `${FileSystem.cacheDirectory}event-${input.bookingId}.pkpass`;
      await FileSystem.writeAsStringAsync(passPath, b64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      logWalletPass('pass_saved', {
        bookingId: input.bookingId,
        bytes: buf.byteLength,
        passPath,
      });
      await presentPkPass({ fileUri: passPath, base64: b64 });
      return;
    }

    const { raw, json } = await readWalletPassResponseBody(res);
    if (json?.signedUrl) {
      const passPath = `${FileSystem.cacheDirectory}event-${input.bookingId}.pkpass`;
      await FileSystem.downloadAsync(json.signedUrl, passPath);
      logWalletPass('pass_downloaded', { bookingId: input.bookingId, signedUrl: true });
      const downloadedB64 = await FileSystem.readAsStringAsync(passPath, {
        encoding: FileSystem.EncodingType.Base64,
      });
      await presentPkPass({ fileUri: passPath, base64: downloadedB64 });
      return;
    }

    const userMessage = json?.error
      ? walletPassUserMessage(res.status, json, raw)
      : 'Unexpected response from the server (not a .pkpass file).';
    reportWalletPassFailure(
      'unexpected_success_response',
      {
        status: res.status,
        contentType,
        responseJson: json,
        responseRaw: raw.slice(0, 500),
        bookingId: input.bookingId,
      },
      userMessage,
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    reportWalletPassFailure(
      'generate_pass_exception',
      {
        url,
        request: payload,
        error: message,
        stack: e instanceof Error ? e.stack : undefined,
      },
      userFacingErrorBody('add this pass to Apple Wallet'),
    );
  }
}

/** Presents Apple's native Add to Wallet sheet (PKAddPassesViewController). */
async function presentPkPass(input: { fileUri: string; base64: string }): Promise<void> {
  const { fileUri, base64 } = input;

  if (Platform.OS === 'ios' && isAppleWalletPassNativeAvailable() && canAddAppleWalletPass()) {
    try {
      logWalletPass('present_wallet_sheet', { fileUri });
      const added = await presentAppleWalletPassFromBase64(base64);
      if (added !== null) {
        logWalletPass('wallet_sheet_done', { fileUri, added });
        return;
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      logWalletPassError('wallet_native_failed', { fileUri, error: message });
    }
  } else if (Platform.OS === 'ios') {
    logWalletPass('wallet_native_not_linked', {
      fileUri,
      hint: 'Install a new iOS build — PassKit native module is not in this binary yet.',
    });
    if (!warnedWalletNativeNotLinked) {
      warnedWalletNativeNotLinked = true;
      Alert.alert(
        'App update required',
        'The full-screen Apple Wallet preview is in the next native iOS build. This install will use the share sheet — scroll and tap Add to Wallet.',
      );
    }
  }

  if (!(await Sharing.isAvailableAsync())) {
    logWalletPassError('share_unavailable', { fileUri });
    Alert.alert(
      'Apple Wallet',
      'Could not open the pass on this device. Install the latest iOS app build to use the native Wallet sheet.',
    );
    return;
  }
  logWalletPass('present_share_sheet_fallback', { fileUri });
  await Sharing.shareAsync(fileUri, {
    mimeType: 'application/vnd.apple.pkpass',
    UTI: 'com.apple.pkpass',
    dialogTitle: 'Add to Apple Wallet',
  });
}
