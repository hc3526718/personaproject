import type { AppUser } from '../auth/AuthContext';
import { isPremiumDemoEmail } from '../auth/demoAccounts';

/** Dalton Academy master / staff roles that bypass the mandatory access subscription. */
export function isAccessExemptUser(user: AppUser | null, sessionEmail?: string | null): boolean {
  if (!user) return false;
  if (user.id.startsWith('demo-')) return true;
  if (user.masterControl) return true;
  if (user.role === 'admin' || user.role === 'super_admin') return true;
  if (sessionEmail && isPremiumDemoEmail(sessionEmail)) return true;
  return false;
}

/** Mandatory £2/mo (or active subscription_state) required before using the app. */
export function hasAppAccess(user: AppUser | null, isPro: boolean, sessionEmail?: string | null): boolean {
  if (isAccessExemptUser(user, sessionEmail)) return true;
  return isPro;
}
