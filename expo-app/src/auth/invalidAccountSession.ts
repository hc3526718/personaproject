import type { PostgrestError } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { clearStaleAuthSession } from './authSessionRecovery';

/** Auth user removed server-side while a local JWT session still exists. */
export function isAccountGoneError(err: unknown): boolean {
  if (!err) return false;
  const parts: string[] = [];
  if (typeof err === 'string') {
    parts.push(err);
  } else if (typeof err === 'object') {
    const e = err as {
      message?: string;
      code?: string;
      details?: string;
      hint?: string;
      status?: number;
      name?: string;
    };
    if (e.message) parts.push(e.message);
    if (e.code) parts.push(e.code);
    if (e.details) parts.push(e.details);
    if (e.hint) parts.push(e.hint);
    if (e.name) parts.push(e.name);
    if (typeof e.status === 'number') parts.push(String(e.status));
  }
  const blob = parts.join(' ').toLowerCase();
  if (!blob) return false;
  return (
    blob.includes('profiles_id_fkey') ||
    blob.includes('foreign key constraint') ||
    blob.includes('violates foreign key') ||
    blob.includes('user not found') ||
    blob.includes('user_from_token_not_found') ||
    blob.includes('invalid claim') ||
    blob.includes('sub claim') ||
    blob.includes('jwt') && blob.includes('invalid') ||
    blob.includes('session_not_found') ||
    blob.includes('23503')
  );
}

export function isAccountGonePostgrestError(error: PostgrestError | null | undefined): boolean {
  if (!error) return false;
  return isAccountGoneError(error);
}

/** Returns false when the signed-in auth user no longer exists (deleted account). */
export async function verifyAuthUserStillExists(supabase: SupabaseClient): Promise<boolean> {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) return !isAccountGoneError(error);
    return Boolean(data.user?.id);
  } catch (err) {
    return !isAccountGoneError(err);
  }
}

/** Clear local session when the account was deleted or JWT is no longer valid. */
export async function signOutDeletedAccountSession(
  supabase: SupabaseClient | null,
  logout?: () => Promise<void>,
): Promise<void> {
  if (logout) {
    await logout();
    return;
  }
  if (supabase) {
    await clearStaleAuthSession(supabase);
  }
}
