import type { AppUser } from './AuthContext';

/** Master control or elevated admin role — must enroll TOTP before Master Control. */
export function isStaffAccount(user: AppUser | null | undefined): boolean {
  if (!user) return false;
  if (user.masterControl === true) return true;
  const role = (user.role ?? '').toLowerCase();
  return role === 'admin' || role === 'super_admin';
}
