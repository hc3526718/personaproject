/** Resend sandbox sender — works without a verified domain (limited deliverability). */
export const RESEND_SANDBOX_FROM = 'The Dalton Grant Academy <onboarding@resend.dev>';

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
  if (!/^[^<@\s]+<[^>]+@[^>]+>$/.test(configured) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(configured)) {
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
