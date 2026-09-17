import type { AppUser } from './AuthContext';

/** Master control or elevated admin role — may enroll TOTP (recommended, not required for Master Control). */
export function isStaffAccount(user: AppUser | null | undefined): boolean {
  if (!user) return false;
  if (user.masterControl === true) return true;
  const role = (user.role ?? '').toLowerCase();
  return role === 'admin' || role === 'super_admin';
}

/**
 * Check if a user can manage an event (edit, delete, access overflow menu).
 * True for: masterControl users, admins/super_admins, or the event creator.
 */
export function canManageEvent(
  user: AppUser | null | undefined,
  eventCreatorId?: string | null,
): boolean {
  if (!user) return false;
  if (isStaffAccount(user)) return true;
  if (eventCreatorId && user.id === eventCreatorId) return true;
  return false;
}
