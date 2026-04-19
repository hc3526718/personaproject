import * as Crypto from 'expo-crypto';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * OAuth redirect must match Supabase Dashboard → Authentication → URL Configuration → Redirect URLs
 * (e.g. `dalton-demo://auth/callback` when `scheme` in app config is `dalton-demo`).
 */
export function getOAuthRedirectUri(): string {
  return Linking.createURL('auth/callback');
}

/** Reject forged OAuth returns (wrong app scheme vs expected redirect). */
export function isOAuthReturnUrlTrusted(returnUrl: string, redirectTo: string): boolean {
  try {
    const a = Linking.parse(returnUrl);
    const b = Linking.parse(redirectTo);
    if (!a.scheme || !b.scheme) return false;
    return a.scheme === b.scheme;
  } catch {
    return false;
  }
}

export async function signInWithGoogleOAuth(
  supabase: SupabaseClient,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const redirectTo = getOAuthRedirectUri();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });
  if (error) return { ok: false, message: error.message };
  if (!data.url) return { ok: false, message: 'No OAuth URL returned' };

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type === 'cancel') return { ok: false, message: 'Sign in cancelled' };
  if (result.type !== 'success' || !result.url) {
    return { ok: false, message: 'Could not complete Google sign in' };
  }
  if (!isOAuthReturnUrlTrusted(result.url, redirectTo)) {
    return { ok: false, message: 'Unexpected sign-in redirect' };
  }

  const parsed = Linking.parse(result.url);
  const codeRaw = parsed.queryParams?.code;
  const code = Array.isArray(codeRaw) ? codeRaw[0] : codeRaw;
  if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) return { ok: false, message: exchangeError.message };
    return { ok: true };
  }

  const errDesc = parsed.queryParams?.error_description;
  const err = parsed.queryParams?.error;
  if (err || errDesc) {
    const msg = Array.isArray(errDesc) ? errDesc[0] : errDesc;
    return { ok: false, message: msg || String(err) };
  }

  return { ok: false, message: 'No authorization code in redirect' };
}

export async function signInWithAppleNative(
  supabase: SupabaseClient,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (Platform.OS !== 'ios') {
    return { ok: false, message: 'Apple Sign In is only available on iOS' };
  }
  /** Static import loads native code and crashes Expo Go when the bundle evaluates. */
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    return {
      ok: false,
      message:
        'Apple Sign In is not available in Expo Go. Create a development build: https://docs.expo.dev/develop/development-builds/introduction/',
    };
  }

  let AppleAuthentication: typeof import('expo-apple-authentication');
  try {
    AppleAuthentication = require('expo-apple-authentication');
  } catch {
    return {
      ok: false,
      message: 'Sign in with Apple native module is missing. Rebuild with EAS or npx expo run:ios.',
    };
  }

  try {
    const available = await AppleAuthentication.isAvailableAsync();
    if (!available) {
      return { ok: false, message: 'Apple Sign In is not available on this device' };
    }

    const rawNonce = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    const hashedNonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      rawNonce,
      { encoding: Crypto.CryptoEncoding.HEX },
    );

    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });

    if (!credential.identityToken) {
      return { ok: false, message: 'Apple did not return an identity token' };
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
      nonce: rawNonce,
    });
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'code' in e && (e as { code: string }).code === 'ERR_REQUEST_CANCELED') {
      return { ok: false, message: 'Sign in cancelled' };
    }
    const msg = e instanceof Error ? e.message : 'Apple sign in failed';
    return { ok: false, message: msg };
  }
}
