import type { AppUser } from '../auth/AuthContext';
import { isPremiumDemoEmail } from '../auth/demoAccounts';

function accessExemptEmailAllowlist(): Set<string> {
  const raw = (process.env.EXPO_PUBLIC_ACCESS_EXEMPT_EMAILS ?? '').trim();
  if (!raw) return new Set();
  return new Set(
    raw
      .split(/[,;\s]+/)
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

/** Emails listed in EXPO_PUBLIC_ACCESS_EXEMPT_EMAILS (comma-separated) skip the £2/mo paywall. */
export function isAccessExemptEmail(email: string | null | undefined): boolean {
  if (!email?.trim()) return false;
  return accessExemptEmailAllowlist().has(email.trim().toLowerCase());
}

/** Dalton Academy master / staff roles that bypass the mandatory access subscription. */
export function isAccessExemptUser(user: AppUser | null, sessionEmail?: string | null): boolean {
  if (!user) return false;
  if (user.id.startsWith('demo-')) return true;
  if (user.masterControl) return true;
  if (user.role === 'admin' || user.role === 'super_admin') return true;
  if (sessionEmail && isPremiumDemoEmail(sessionEmail)) return true;
  if (isAccessExemptEmail(sessionEmail ?? user.email)) return true;
  return false;
}

/** Mandatory £2/mo academy access — requires `subscription_state.is_payment_verified`. */
export function hasAppAccess(
  user: AppUser | null,
  isPaymentVerified: boolean,
  sessionEmail?: string | null,
): boolean {
  if (isAccessExemptUser(user, sessionEmail)) return true;
  return isPaymentVerified;
}
