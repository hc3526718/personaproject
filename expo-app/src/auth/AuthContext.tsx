import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { Alert } from 'react-native';
import { isSupabaseConfigured } from '../lib/env';
import { getSupabase } from '../lib/supabase';
import { signInWithAppleNative, signInWithGoogleOAuth } from './oauthSupabase';
import { AUTH_GET_SESSION_TIMEOUT_MS } from '../constants/bootTiming';
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
  /** From Supabase user_metadata.role or demo default */
  role: 'member' | 'admin' | 'super_admin';
  /** Dalton-verified creator/host — set in user_metadata.dalton_verified for Supabase */
  daltonVerified: boolean;
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
  /** Demo or Supabase email/password */
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

    const applySessionUser = async (session: Session | null) => {
      if (session?.user) {
        setUser(appUserFromSupabaseUser(session.user));
        void (async () => {
          try {
            await ensureDefaultDaltonVerifiedMetadata(supabase);
            if (cancelled) return;
            const { data: fresh } = await supabase.auth.getSession();
            if (cancelled || !fresh.session?.user) return;
            setUser(appUserFromSupabaseUser(fresh.session.user));
          } catch {
            /* metadata refresh is best-effort */
          }
        })();
      } else {
        setUser(null);
      }
    };

    const timeoutId = setTimeout(() => {
      if (cancelled) return;
      captureAuthSessionTimeout();
      /** Unblock cold start; a slow `getSession()` may still resolve afterward and update `user`. */
      setReady(true);
    }, AUTH_GET_SESSION_TIMEOUT_MS);
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        clearTimeout(timeoutId);
        await applySessionUser(data.session ?? null);
        setReady(true);
      } catch {
        if (cancelled) return;
        clearTimeout(timeoutId);
        setUser(null);
        setReady(true);
      }
    })();
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        if (cancelled) return;
        await applySessionUser(session);
      } finally {
        if (!cancelled) setReady(true);
      }
    });
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

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
        return true;
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
    if (supabase) await supabase.auth.signOut();
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
    setOAuthBusy(false);
    if (!result.ok) {
      if (result.message !== 'Sign in cancelled') {
        Alert.alert('Google sign in', result.message);
      }
      return false;
    }
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) {
      setUser(appUserFromSupabaseUser(data.session.user));
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
