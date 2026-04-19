/**
 * Offline / no-Supabase demo credentials. Do not use in production backends.
 * Premium demo: RevenueCat-free “Premium” + super_admin role for admin/media flows.
 */
export const PREMIUM_DEMO_EMAIL = 'dalton.media.admin@dalton.test';
export const PREMIUM_DEMO_PASSWORD = 'DaltonMediaAdmin1!';

export function isPremiumDemoEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === PREMIUM_DEMO_EMAIL.toLowerCase();
}
