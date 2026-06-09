import type { Session, SupabaseClient } from '@supabase/supabase-js';

/** Stored session tokens no longer valid server-side (deleted user, revoked refresh, etc.). */
export function isStaleRefreshTokenError(err: unknown): boolean {
  if (!err) return false;
  if (typeof err === 'object') {
    const e = err as { name?: string; message?: string; code?: string };
    if (e.name === 'AuthApiError') {
      const code = (e.code ?? '').toLowerCase();
      if (
        code.includes('refresh') ||
        code === 'refresh_token_not_found' ||
        code === 'invalid_refresh_token'
      ) {
        return true;
      }
    }
    const m = (e.message ?? '').toLowerCase();
    if (
      m.includes('refresh token') &&
      (m.includes('invalid') || m.includes('not found') || m.includes('revoked'))
    ) {
      return true;
    }
  }
  if (typeof err === 'string') {
    const m = err.toLowerCase();
    return (
      m.includes('refresh token') &&
      (m.includes('invalid') || m.includes('not found') || m.includes('revoked'))
    );
  }
  return false;
}

export async function clearStaleAuthSession(supabase: SupabaseClient): Promise<void> {
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    /* Storage may already be cleared */
  }
}

let recoveryPromise: Promise<void> | null = null;

/** Serialize stale-session cleanup so parallel getSession calls only hit the API once. */
export async function recoverStaleAuthSession(
  supabase: SupabaseClient,
  err: unknown,
): Promise<void> {
  if (!isStaleRefreshTokenError(err)) return;
  if (!recoveryPromise) {
    recoveryPromise = clearStaleAuthSession(supabase).finally(() => {
      recoveryPromise = null;
    });
  }
  await recoveryPromise;
}

export async function safeGetSession(supabase: SupabaseClient): Promise<Session | null> {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      await recoverStaleAuthSession(supabase, error);
      return null;
    }
    return data.session ?? null;
  } catch (err) {
    await recoverStaleAuthSession(supabase, err);
    return null;
  }
}

let recoveryListenerAttached = false;

/** Clear invalid persisted sessions when Supabase signs out after a failed refresh. */
export function attachSupabaseAuthRecovery(supabase: SupabaseClient): void {
  if (recoveryListenerAttached) return;
  recoveryListenerAttached = true;

  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_OUT' && !session) {
      await clearStaleAuthSession(supabase);
    }
  });
}
