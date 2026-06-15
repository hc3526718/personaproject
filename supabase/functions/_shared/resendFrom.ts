/** Resend sandbox sender — works without a verified domain (limited deliverability). */
export const RESEND_SANDBOX_FROM = 'The Dalton Grant Academy <onboarding@resend.dev>';

function isValidResendFrom(configured: string): boolean {
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(configured)) return true;
  // Display name may contain spaces: `The Dalton Grant Academy <noreply@domain>`
  return /^.+<[^\s@]+@[^\s@]+\.[^\s@]+>$/.test(configured);
}

/**
 * RESEND_FROM_EMAIL must be a Resend-verified domain. Values like *@*.vercel.app are rejected.
 */
export function resolveResendFromAddress(): string {
  const configured = Deno.env.get('RESEND_FROM_EMAIL')?.trim();
  if (!configured) return RESEND_SANDBOX_FROM;
  if (/\.vercel\.app>/i.test(configured) || /\.vercel\.app$/i.test(configured)) {
    console.warn('[resend] RESEND_FROM_EMAIL uses vercel.app — falling back to sandbox sender');
    return RESEND_SANDBOX_FROM;
  }
  if (!isValidResendFrom(configured)) {
    console.warn('[resend] RESEND_FROM_EMAIL format invalid — falling back to sandbox sender');
    return RESEND_SANDBOX_FROM;
  }
  return configured;
}

export function resendFromFallbacks(): string[] {
  const primary = resolveResendFromAddress();
  if (primary === RESEND_SANDBOX_FROM) return [primary];
  return [primary, RESEND_SANDBOX_FROM];
}
