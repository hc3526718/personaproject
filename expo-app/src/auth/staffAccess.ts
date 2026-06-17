import type { AppUser } from './AuthContext';

/** Master control or elevated admin role — may enroll TOTP (recommended, not required for Master Control). */
export function isStaffAccount(user: AppUser | null | undefined): boolean {
  if (!user) return false;
  if (user.masterControl === true) return true;
  const role = (user.role ?? '').toLowerCase();
  return role === 'admin' || role === 'super_admin';
}
