import type { AppUser } from '../auth/AuthContext';

/**
 * Premium (or elevated role) plus Dalton verification — server should mirror before accepting uploads.
 */
export function canCreateVerifiedContent(isPro: boolean, user: AppUser | null): boolean {
  if (!user?.daltonVerified) return false;
  if (isPro) return true;
  if (user.role === 'admin' || user.role === 'super_admin') return true;
  return false;
}
