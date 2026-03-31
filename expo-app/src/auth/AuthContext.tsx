import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getSupabase } from '../lib/supabase';

export const DEMO_EMAIL = 'user123@gmail.com';
export const DEMO_PASSWORD = '12345!';

export type AppUser = {
  id: string;
  email: string;
  /** From Supabase user_metadata.role or demo default */
  role: 'member' | 'admin' | 'super_admin';
};

type AuthContextValue = {
  ready: boolean;
  isAuthenticated: boolean;
  user: AppUser | null;
  sessionEmail: string | null;
  /** Demo or Supabase email/password */
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function roleFromMetadata(meta: Record<string, unknown> | undefined): AppUser['role'] {
  const r = meta?.role;
  if (r === 'super_admin' || r === 'admin' || r === 'member') return r;
  return 'member';
}

function demoRoleForEmail(email: string): AppUser['role'] {
  if (email.trim().toLowerCase() === DEMO_EMAIL.toLowerCase()) return 'super_admin';
  return 'member';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = getSupabase();
  const [ready, setReady] = useState(!supabase);
  const [user, setUser] = useState<AppUser | null>(null);

  useEffect(() => {
    if (!supabase) {
      setReady(true);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      const s = data.session;
      if (s?.user) {
        setUser({
          id: s.user.id,
          email: s.user.email ?? '',
          role: roleFromMetadata(s.user.user_metadata as Record<string, unknown>),
        });
      } else {
        setUser(null);
      }
      setReady(true);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email ?? '',
          role: roleFromMetadata(session.user.user_metadata as Record<string, unknown>),
        });
      } else {
        setUser(null);
      }
    });
    return () => {
      cancelled = true;
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
        return true;
      }
      const ok =
        trimmed.toLowerCase() === DEMO_EMAIL.toLowerCase() && password === DEMO_PASSWORD;
      if (ok) {
        setUser({
          id: 'demo-user',
          email: trimmed,
          role: demoRoleForEmail(trimmed),
        });
      }
      return ok;
    },
    [supabase],
  );

  const logout = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
    setUser(null);
  }, [supabase]);

  const value = useMemo(
    () => ({
      ready,
      isAuthenticated: !!user,
      user,
      sessionEmail: user?.email ?? null,
      login,
      logout,
    }),
    [ready, user, login, logout],
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
