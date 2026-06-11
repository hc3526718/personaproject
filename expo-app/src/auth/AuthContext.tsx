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
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import { isSupabaseConfigured } from '../lib/env';
import { getSupabase } from '../lib/supabase';
import {
  cleanupWebAuthUrlAfterSignIn,
  completeWebOAuthSessionIfNeeded,
  getOAuthRedirectUri,
  ingestSessionFromAuthCallbackUrl,
  signInWithAppleNative,
  signInWithGoogleOAuth,
} from './oauthSupabase';
import { authAlert } from './authAlert';
import { AUTH_BOOT_UNLOCK_MS, AUTH_GET_SESSION_TIMEOUT_MS } from '../constants/bootTiming';
import { warmDaltonAuthVideoCache } from '../constants/daltonAuthVideo';
import { setAllowMessagesFrom } from '../messaging/messagingPrefs';
import {
  ensureProfileRow,
  fetchProfileByUserId,
  syncProfileDisplayNameFromAuth,
} from '../roadmap/profileService';
import { ensureDefaultDaltonVerifiedMetadata } from './userMetadataSupabase';
import {
  DEMO_EMAIL,
  getDevDemoLegacyPassword,
  getDevDemoPremiumPassword,
  isPremiumDemoEmail,
  PREMIUM_DEMO_EMAIL,
} from './demoAccounts';
import {
  clearStaleAuthSession,
  isStaleRefreshTokenError,
  recoverStaleAuthSession,
  safeGetSession,
} from './authSessionRecovery';
import { mapAuthEmailErrorMessage, mapSignUpErrorMessage } from './passwordValidation';
import { hasVerifiedTotpFactor, needsMfaStepUp } from './mfaService';

export { DEMO_EMAIL, PREMIUM_DEMO_EMAIL } from './demoAccounts';

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

export type LoginResult =
  | { ok: true }
  | { ok: false; reason: 'invalid_credentials' }
  | { ok: false; reason: 'email_not_confirmed'; email: string };

type AuthContextValue = {
  ready: boolean;
  isAuthenticated: boolean;
  user: AppUser | null;
  sessionEmail: string | null;
  oAuthBusy: boolean;
  /** Email/password via Supabase, or local preview when env is unset */
  login: (email: string, password: string) => Promise<LoginResult>;
  /** Supabase email/password registration; no-op when Supabase is not configured */
  signUp: (email: string, password: string) => Promise<SignUpResult>;
  /** Email magic link → same redirect URL as OAuth (`/app/auth/callback` on web, native scheme deep link). */
  requestPasswordReset: (email: string) => Promise<{ ok: true } | { ok: false; message: string }>;
  passwordRecoveryPending: boolean;
  clearPasswordRecoveryFlow: () => void;
  signInWithGoogle: () => Promise<boolean>;
  signInWithApple: () => Promise<boolean>;
  logout: () => Promise<void>;
  /** Session at AAL1 but TOTP step-up required before app access. */
  mfaStepUpPending: boolean;
  clearMfaStepUp: () => void;
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
    daltonVerified: false,
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
  const [passwordRecoveryPending, setPasswordRecoveryPending] = useState(false);
  const [mfaStepUpPending, setMfaStepUpPending] = useState(false);

  const refreshMfaStepUp = useCallback(async () => {
    if (!supabase) {
      setMfaStepUpPending(false);
      return;
    }
    const enrolled = await hasVerifiedTotpFactor();
    if (!enrolled) {
      setMfaStepUpPending(false);
      return;
    }
    const stepUp = await needsMfaStepUp();
    setMfaStepUpPending(stepUp);
  }, [supabase]);

  const clearMfaStepUp = useCallback(() => {
    setMfaStepUpPending(false);
  }, []);

  /** Preload auth hero video while logged out (web preload + native hidden player). */
  useEffect(() => {
    if (ready && !user) warmDaltonAuthVideoCache();
  }, [ready, user]);

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
          return { ...prev, daltonVerified: false, masterControl: mc };
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
        void syncProfileDisplayNameFromAuth(
          session.user.id,
          session.user.user_metadata as Record<string, unknown> | undefined,
          session.user.email ?? null,
        );
        void hydrateDmPolicy(session.user.id);
        void syncProfileFlags(session.user.id);
        void import('../lib/pushRegistration').then((m) =>
          m.schedulePushRegistration(session.user.id),
        );
        void (async () => {
          try {
            await ensureDefaultDaltonVerifiedMetadata(supabase);
          } catch {
            /* metadata refresh is best-effort */
          }
        })();
        void refreshMfaStepUp();
      } else {
        setAllowMessagesFrom('everyone');
        setUser(null);
        setMfaStepUpPending(false);
      }
    };

    let sessionResolved = false;
    const unlockId = setTimeout(() => {
      if (cancelled || sessionResolved) return;
      setReady(true);
    }, AUTH_BOOT_UNLOCK_MS);

    const slowSessionId = setTimeout(() => {
      if (cancelled || sessionResolved) return;
      try {
        require('../monitoring/sentryBoot').captureAuthSessionTimeout();
      } catch {
        /* Sentry optional */
      }
    }, AUTH_GET_SESSION_TIMEOUT_MS);

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (cancelled) return;
        if (event === 'PASSWORD_RECOVERY') {
          setPasswordRecoveryPending(true);
        }
        if (
          Platform.OS === 'web' &&
          (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') &&
          session
        ) {
          cleanupWebAuthUrlAfterSignIn();
        }
        await applySessionUser(session);
      } catch (err) {
        if (!cancelled && isStaleRefreshTokenError(err)) {
          await recoverStaleAuthSession(supabase, err);
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setOAuthBusy(false);
          setReady(true);
        }
      }
    });

    (async () => {
      try {
        if (Platform.OS === 'web') {
          const oauth = await completeWebOAuthSessionIfNeeded(supabase);
          if (oauth.error) {
            const afterOAuth = await safeGetSession(supabase);
            if (!afterOAuth) {
              authAlert('Google sign in', oauth.error);
            }
          }
        }
        const session = await safeGetSession(supabase);
        if (cancelled) return;
        sessionResolved = true;
        clearTimeout(unlockId);
        clearTimeout(slowSessionId);
        await applySessionUser(session);
        setReady(true);
      } catch (err) {
        if (cancelled) return;
        sessionResolved = true;
        clearTimeout(unlockId);
        clearTimeout(slowSessionId);
        if (isStaleRefreshTokenError(err)) {
          await recoverStaleAuthSession(supabase, err);
        }
        setUser(null);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
      clearTimeout(unlockId);
      clearTimeout(slowSessionId);
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  /** Web: password recovery links set this flag in `completeWebOAuthSessionIfNeeded` before the hash is cleared. */
  useEffect(() => {
    if (!user?.id || Platform.OS !== 'web' || typeof sessionStorage === 'undefined') return;
    try {
      if (sessionStorage.getItem('dga_auth_recovery_pending') === '1') {
        sessionStorage.removeItem('dga_auth_recovery_pending');
        setPasswordRecoveryPending(true);
      }
    } catch {
      /* ignore */
    }
  }, [user?.id]);

  /** Native deep link: `/auth/callback` from email confirmation or password recovery. */
  useEffect(() => {
    if (!supabase || Platform.OS === 'web') return;
    let alive = true;
    const ingest = async (url: string) => {
      if (!url.includes('auth/callback') && !url.includes('access_token')) return;
      const { ok, error } = await ingestSessionFromAuthCallbackUrl(supabase, url);
      if (!alive || !ok) {
        if (error === 'missing_tokens') return;
        if (error && __DEV__) console.warn('[auth] deep link session failed:', error);
        return;
      }
      // `onAuthStateChange` persists session → `applySessionUser` runs via subscription.
    };
    const sub = Linking.addEventListener('url', ({ url }) => {
      void ingest(url);
    });
    void Linking.getInitialURL().then((url) => {
      if (url) void ingest(url);
    });
    return () => {
      alive = false;
      sub.remove();
    };
  }, [supabase]);

  const login = useCallback(
    async (email: string, password: string): Promise<LoginResult> => {
      const trimmed = email.trim();
      if (supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: trimmed,
          password,
        });
        if (error) {
          const code = (error as { code?: string }).code ?? '';
          const msg = (error.message ?? '').toLowerCase();
          if (
            code === 'email_not_confirmed' ||
            msg.includes('email not confirmed') ||
            msg.includes('not confirmed')
          ) {
            return { ok: false, reason: 'email_not_confirmed', email: trimmed };
          }
          return { ok: false, reason: 'invalid_credentials' };
        }
        if (!data.session?.user) return { ok: false, reason: 'invalid_credentials' };
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
        const enrolled = await hasVerifiedTotpFactor();
        if (enrolled) {
          const stepUp = await needsMfaStepUp();
          setMfaStepUpPending(stepUp);
        } else {
          setMfaStepUpPending(false);
        }
        return { ok: true };
      }
      /** Offline demo login: __DEV__ only; passwords via EXPO_PUBLIC_DEV_DEMO_* (never bundled in release). */
      if (!__DEV__) return { ok: false, reason: 'invalid_credentials' };

      const legacyPw = getDevDemoLegacyPassword();
      const premiumPw = getDevDemoPremiumPassword();

      const demoLegacy =
        legacyPw.length > 0 &&
        trimmed.toLowerCase() === DEMO_EMAIL.toLowerCase() &&
        password === legacyPw;

      const demoPremium =
        premiumPw.length > 0 &&
        trimmed.toLowerCase() === PREMIUM_DEMO_EMAIL.toLowerCase() &&
        password === premiumPw;

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
      return ok ? { ok: true } : { ok: false, reason: 'invalid_credentials' };
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
          emailRedirectTo: getOAuthRedirectUri(),
        },
      });
      if (error) {
        return { ok: false, message: mapSignUpErrorMessage(error.message) };
      }
      if (data.session?.user) {
        return { ok: true, needsEmailConfirmation: false };
      }
      return { ok: true, needsEmailConfirmation: true };
    },
    [supabase],
  );

  const requestPasswordReset = useCallback(
    async (email: string): Promise<{ ok: true } | { ok: false; message: string }> => {
      if (!supabase) {
        return { ok: false, message: 'Supabase is not configured.' };
      }
      const trimmed = email.trim();
      if (!trimmed) {
        return { ok: false, message: 'Enter your email address.' };
      }
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: getOAuthRedirectUri(),
      });
      if (error) return { ok: false, message: mapAuthEmailErrorMessage(error.message) };
      return { ok: true };
    },
    [supabase],
  );

  const clearPasswordRecoveryFlow = useCallback(() => {
    setPasswordRecoveryPending(false);
    if (Platform.OS === 'web') {
      cleanupWebAuthUrlAfterSignIn();
    }
  }, []);

  const logout = useCallback(async () => {
    setOAuthBusy(false);
    if (supabase) {
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch {
        await clearStaleAuthSession(supabase);
      }
    }
    if (Platform.OS === 'web') {
      cleanupWebAuthUrlAfterSignIn();
    }
    setUser(null);
    setMfaStepUpPending(false);
  }, [supabase]);

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) {
      authAlert(
        'Supabase not configured',
        'Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in Vercel (Production) and redeploy, or in expo-app/.env for local web.',
      );
      return false;
    }
    setOAuthBusy(true);
    try {
      const result = await signInWithGoogleOAuth(supabase);
      if (!result.ok) {
        setOAuthBusy(false);
        if (result.message !== 'Sign in cancelled') {
          authAlert('Google sign in', result.message);
        }
        return false;
      }
      if (Platform.OS === 'web') {
        return true;
      }
      const session = await safeGetSession(supabase);
      if (session?.user) {
        setUser(appUserFromSupabaseUser(session.user));
        void (async () => {
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('dalton_verified, master_control')
              .eq('id', session.user.id)
              .maybeSingle();
            if (profile?.dalton_verified || profile?.master_control === 'yes') {
              setUser((prev) =>
                prev?.id === session.user.id
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
    } catch {
      setOAuthBusy(false);
      return false;
    }
  }, [supabase]);

  const signInWithApple = useCallback(async () => {
    if (!supabase) {
      authAlert(
        'Supabase not configured',
        'Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in Vercel (Production) and redeploy, or in expo-app/.env for local web.',
      );
      return false;
    }
    setOAuthBusy(true);
    const result = await signInWithAppleNative(supabase);
    setOAuthBusy(false);
    if (!result.ok) {
      if (result.message !== 'Sign in cancelled') {
        authAlert('Apple sign in', result.message);
      }
      return false;
    }
    const session = await safeGetSession(supabase);
    if (session?.user) {
      setUser(appUserFromSupabaseUser(session.user));
      void (async () => {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('dalton_verified, master_control')
            .eq('id', session.user.id)
            .maybeSingle();
          if (profile?.dalton_verified || profile?.master_control === 'yes') {
            setUser((prev) =>
              prev?.id === session.user.id
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
      requestPasswordReset,
      passwordRecoveryPending,
      clearPasswordRecoveryFlow,
      signInWithGoogle,
      signInWithApple,
      logout,
      mfaStepUpPending,
      clearMfaStepUp,
    }),
    [
      ready,
      user,
      oAuthBusy,
      login,
      signUp,
      requestPasswordReset,
      passwordRecoveryPending,
      clearPasswordRecoveryFlow,
      signInWithGoogle,
      signInWithApple,
      logout,
      mfaStepUpPending,
      clearMfaStepUp,
    ],
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
