import type { AppUser } from '../auth/AuthContext';

/**
 * Premium (or elevated role) plus Dalton verification — server should mirror before accepting uploads.
 */
/** Premium or admin hosts can create events/media once Dalton-verified (server should mirror). */
export function canCreateVerifiedContent(isPro: boolean, user: AppUser | null): boolean {
  if (user?.masterControl) return true;
  if (!user?.daltonVerified) return false;
  if (user.role === 'admin' || user.role === 'super_admin') return true;
  return isPro;
}
