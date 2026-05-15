/**
 * Local preview sign-in when Supabase env is unavailable. Do not ship these credentials to production backends.
 */
export const PREMIUM_DEMO_EMAIL = 'dalton.media.admin@dalton.test';
export const PREMIUM_DEMO_PASSWORD = 'DaltonMediaAdmin1!';

export function isPremiumDemoEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === PREMIUM_DEMO_EMAIL.toLowerCase();
}
