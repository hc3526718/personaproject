import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { Alert, Platform } from 'react-native';
import { isSupabaseConfigured } from '../lib/env';
import { getSupabase } from '../lib/supabase';
import { signInWithAppleNative, signInWithGoogleOAuth } from './oauthSupabase';
import { AUTH_BOOT_UNLOCK_MS, AUTH_GET_SESSION_TIMEOUT_MS } from '../constants/bootTiming';
import { setAllowMessagesFrom } from '../messaging/messagingPrefs';
import { ensureProfileRow, fetchProfileByUserId } from '../roadmap/profileService';
import { captureAuthSessionTimeout } from '../monitoring/sentryBoot';
import { ensureDefaultDaltonVerifiedMetadata } from './userMetadataSupabase';
import {
  isPremiumDemoEmail,
  PREMIUM_DEMO_EMAIL,
  PREMIUM_DEMO_PASSWORD,
} from './demoAccounts';

export const DEMO_EMAIL = 'user123@gmail.com';
export const DEMO_PASSWORD = '12345!';
export { PREMIUM_DEMO_EMAIL, PREMIUM_DEMO_PASSWORD } from './demoAccounts';

export type AppUser = {
  id: string;
  email: string;
  /** From Supabase user_metadata.role or local preview default */
  role: 'member' | 'admin' | 'super_admin';
  /** Dalton-verified creator/host — set in user_metadata.dalton_verified for Supabase */
  daltonVerified: boolean;
  /** From profiles.master_control === 'yes' (hydrated after session). */
  masterControl?: boolean;
};

export type SignUpResult =
  | { ok: true; needsEmailConfirmation: boolean }
  | { ok: false; message: string };

type AuthContextValue = {
  ready: boolean;
  isAuthenticated: boolean;
  user: AppUser | null;
  sessionEmail: string | null;
  oAuthBusy: boolean;
  /** Email/password via Supabase, or local preview when env is unset */
  login: (email: string, password: string) => Promise<boolean>;
  /** Supabase email/password registration; no-op when Supabase is not configured */
  signUp: (email: string, password: string) => Promise<SignUpResult>;
  signInWithGoogle: () => Promise<boolean>;
  signInWithApple: () => Promise<boolean>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function roleFromMetadata(meta: Record<string, unknown> | undefined): AppUser['role'] {
  const r = meta?.role;
  if (r === 'super_admin' || r === 'admin' || r === 'member') return r;
  return 'member';
}

function daltonVerifiedFromMetadata(meta: Record<string, unknown> | undefined): boolean {
  const v = meta?.dalton_verified ?? meta?.daltonVerified;
  return v === true;
}

function appUserFromSupabaseUser(u: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}): AppUser {
  const meta = u.user_metadata;
  return {
    id: u.id,
    email: u.email ?? '',
    role: roleFromMetadata(meta),
    daltonVerified: daltonVerifiedFromMetadata(meta),
  };
}

/** Stored Expo SecureSession tokens no longer valid server-side (e.g. after deleting Auth users). */
function isStaleRefreshTokenError(err: unknown): boolean {
  const raw =
    typeof err === 'object' &&
    err !== null &&
    'message' in err &&
    typeof (err as { message: unknown }).message === 'string'
      ? (err as { message: string }).message
      : '';
  const m = raw.toLowerCase();
  return (
    m.includes('refresh token') &&
    (m.includes('invalid') || m.includes('not found') || m.includes('revoked'))
  );
}

async function clearLocalSupabaseSession(supabase: SupabaseClient): Promise<void> {
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    /* Storage may already be cleared */
  }
}

function demoRoleForEmail(email: string): AppUser['role'] {
  const e = email.trim().toLowerCase();
  if (e === DEMO_EMAIL.toLowerCase()) return 'super_admin';
  if (isPremiumDemoEmail(email)) return 'super_admin';
  return 'member';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  /** Re-render briefly so we pick up `expo.extra` once the dev client manifest is ready. */
  const [, setConfigPoll] = useState(0);
  useEffect(() => {
    if (isSupabaseConfigured()) return;
    let n = 0;
    const id = setInterval(() => {
      n += 1;
      setConfigPoll((c) => c + 1);
      if (isSupabaseConfigured() || n > 24) clearInterval(id);
    }, 125);
    return () => clearInterval(id);
  }, []);

  const supabase = getSupabase();
  const [ready, setReady] = useState(!supabase);
  const [user, setUser] = useState<AppUser | null>(null);
  const [oAuthBusy, setOAuthBusy] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setReady(true);
      return;
    }

    let cancelled = false;

    const syncProfileFlags = async (userId: string) => {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('dalton_verified, master_control')
          .eq('id', userId)
          .maybeSingle();
        if (cancelled) return;
        setUser((prev) => {
          if (prev?.id !== userId) return prev;
          const mc = profile?.master_control === 'yes';
          const dv = prev.daltonVerified || !!profile?.dalton_verified;
          return { ...prev, daltonVerified: dv, masterControl: mc };
        });
      } catch {
        /* non-fatal */
      }
    };

    const hydrateDmPolicy = async (userId: string) => {
      try {
        const row = await fetchProfileByUserId(userId);
        const raw = row?.allow_messages_from?.trim();
        if (raw === 'everyone' || raw === 'followers_only' || raw === 'friends_only') {
          setAllowMessagesFrom(raw);
        }
      } catch {
        /* non-fatal */
      }
    };

    const applySessionUser = async (session: Session | null) => {
      if (session?.user) {
        setUser(appUserFromSupabaseUser(session.user));
        void ensureProfileRow(session.user.id, session.user.email ?? null);
        void hydrateDmPolicy(session.user.id);
        void syncProfileFlags(session.user.id);
        void (async () => {
          try {
            await ensureDefaultDaltonVerifiedMetadata(supabase);
          } catch {
            /* metadata refresh is best-effort */
          }
        })();
      } else {
        setAllowMessagesFrom('everyone');
        setUser(null);
      }
    };

    let sessionResolved = false;
    const unlockId = setTimeout(() => {
      if (cancelled || sessionResolved) return;
      setReady(true);
    }, AUTH_BOOT_UNLOCK_MS);

    const slowSessionId = setTimeout(() => {
      if (cancelled || sessionResolved) return;
      captureAuthSessionTimeout();
    }, AUTH_GET_SESSION_TIMEOUT_MS);

    (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (cancelled) return;
        sessionResolved = true;
        clearTimeout(unlockId);
        clearTimeout(slowSessionId);
        if (error && isStaleRefreshTokenError(error)) {
          await clearLocalSupabaseSession(supabase);
          setUser(null);
          setReady(true);
          return;
        }
        await applySessionUser(data.session ?? null);
        setReady(true);
      } catch (err) {
        if (cancelled) return;
        sessionResolved = true;
        clearTimeout(unlockId);
        clearTimeout(slowSessionId);
        if (isStaleRefreshTokenError(err)) {
          await clearLocalSupabaseSession(supabase);
        }
        setUser(null);
        setReady(true);
      }
    })();
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        if (cancelled) return;
        await applySessionUser(session);
      } catch (err) {
        if (!cancelled && isStaleRefreshTokenError(err)) {
          await clearLocalSupabaseSession(supabase);
          setUser(null);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    });
    return () => {
      cancelled = true;
      clearTimeout(unlockId);
      clearTimeout(slowSessionId);
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const { pathname, search, hash } = window.location;
    const hasOAuthReturn =
      search.includes('code=') ||
      hash.includes('access_token=') ||
      search.includes('error=') ||
      hash.includes('error=');
    if (!hasOAuthReturn) return;
    window.history.replaceState({}, document.title, pathname);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const trimmed = email.trim();
      if (supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: trimmed,
          password,
        });
        if (error || !data.session?.user) return false;
        setUser(appUserFromSupabaseUser(data.session.user));
        void ensureProfileRow(data.session.user.id, data.session.user.email ?? null);
        void (async () => {
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('dalton_verified, master_control')
              .eq('id', data.session!.user.id)
              .maybeSingle();
            if (profile?.dalton_verified || profile?.master_control === 'yes') {
              setUser((prev) =>
                prev?.id === data.session!.user.id
                  ? {
                      ...prev,
                      daltonVerified: prev.daltonVerified || !!profile?.dalton_verified,
                      masterControl: profile?.master_control === 'yes',
                    }
                  : prev,
              );
            }
          } catch {
            /* non-fatal */
          }
        })();
        return true;
      }
      /** Built-in demo accounts must never work in release if Supabase env is missing (known passwords ship in the bundle). */
      if (!__DEV__) {
        return false;
      }
      const demoLegacy =
        trimmed.toLowerCase() === DEMO_EMAIL.toLowerCase() && password === DEMO_PASSWORD;
      const demoPremium =
        trimmed.toLowerCase() === PREMIUM_DEMO_EMAIL.toLowerCase() &&
        password === PREMIUM_DEMO_PASSWORD;
      const ok = demoLegacy || demoPremium;
      if (ok) {
        setUser({
          id: demoPremium ? 'demo-premium-admin' : 'demo-user',
          email: trimmed,
          role: demoRoleForEmail(trimmed),
          daltonVerified: true,
          masterControl: false,
        });
      }
      return ok;
    },
    [supabase],
  );

  const signUp = useCallback(
    async (email: string, password: string): Promise<SignUpResult> => {
      if (!supabase) {
        return { ok: false, message: 'Supabase is not configured' };
      }
      const { error, data } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { dalton_verified: false },
        },
      });
      if (error) {
        return { ok: false, message: error.message };
      }
      if (data.session?.user) {
        return { ok: true, needsEmailConfirmation: false };
      }
      return { ok: true, needsEmailConfirmation: true };
    },
    [supabase],
  );

  const logout = useCallback(async () => {
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch {
        await clearLocalSupabaseSession(supabase);
      }
    }
    setUser(null);
  }, [supabase]);

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) {
      Alert.alert(
        'Supabase not configured',
        'Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to expo-app/.env, restart Metro with npx expo start -c. For EAS dev builds, set the same keys in Expo project Environment Variables and rebuild.',
      );
      return false;
    }
    setOAuthBusy(true);
    const result = await signInWithGoogleOAuth(supabase);
    if (!result.ok) {
      setOAuthBusy(false);
      if (result.message !== 'Sign in cancelled') {
        Alert.alert('Google sign in', result.message);
      }
      return false;
    }
    if (Platform.OS === 'web') {
      return true;
    }
    setOAuthBusy(false);
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) {
      setUser(appUserFromSupabaseUser(data.session.user));
      void (async () => {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('dalton_verified, master_control')
            .eq('id', data.session!.user.id)
            .maybeSingle();
          if (profile?.dalton_verified || profile?.master_control === 'yes') {
            setUser((prev) =>
              prev?.id === data.session!.user.id
                ? {
                    ...prev,
                    daltonVerified: prev.daltonVerified || !!profile?.dalton_verified,
                    masterControl: profile?.master_control === 'yes',
                  }
                : prev,
            );
          }
        } catch {
          /* non-fatal */
        }
      })();
    }
    return true;
  }, [supabase]);

  const signInWithApple = useCallback(async () => {
    if (!supabase) {
      Alert.alert(
        'Supabase not configured',
        'Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to expo-app/.env, restart Metro with npx expo start -c. For EAS dev builds, set the same keys in Expo project Environment Variables and rebuild.',
      );
      return false;
    }
    setOAuthBusy(true);
    const result = await signInWithAppleNative(supabase);
    setOAuthBusy(false);
    if (!result.ok) {
      if (result.message !== 'Sign in cancelled') {
        Alert.alert('Apple sign in', result.message);
      }
      return false;
    }
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) {
      setUser(appUserFromSupabaseUser(data.session.user));
      void (async () => {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('dalton_verified, master_control')
            .eq('id', data.session!.user.id)
            .maybeSingle();
          if (profile?.dalton_verified || profile?.master_control === 'yes') {
            setUser((prev) =>
              prev?.id === data.session!.user.id
                ? {
                    ...prev,
                    daltonVerified: prev.daltonVerified || !!profile?.dalton_verified,
                    masterControl: profile?.master_control === 'yes',
                  }
                : prev,
            );
          }
        } catch {
          /* non-fatal */
        }
      })();
    }
    return true;
  }, [supabase]);

  const value = useMemo(
    () => ({
      ready,
      isAuthenticated: !!user,
      user,
      sessionEmail: user?.email ?? null,
      oAuthBusy,
      login,
      signUp,
      signInWithGoogle,
      signInWithApple,
      logout,
    }),
    [ready, user, oAuthBusy, login, signUp, signInWithGoogle, signInWithApple, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
