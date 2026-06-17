import { Platform } from 'react-native';
import { getDaltonWebUrl, isSupabaseConfigured } from '../lib/env';
import { getSupabase } from '../lib/supabase';
import { coerceApiError } from '../lib/appAlert';

export type StripePlanKey = 'monthly' | 'annual' | 'access';

export type StripePlanDisplay = {
  key: StripePlanKey;
  title: string;
  priceLine: string;
  description: string;
  badge?: string;
};

const DEFAULT_PLANS: StripePlanDisplay[] = [
  {
    key: 'monthly',
    title: 'Monthly',
    priceLine: '£11.99 / month',
    description: 'Full premium access on web and mobile. Cancel anytime.',
  },
  {
    key: 'annual',
    title: 'Annual',
    priceLine: '£99.99 / year',
    description: 'Best value — one subscription across all your devices. Cancel anytime.',
    badge: 'Best value',
  },
];

/** Display copy for the web paywall (amounts come from Stripe Checkout). */
export function getStripePlanDisplays(): StripePlanDisplay[] {
  const raw = (process.env.EXPO_PUBLIC_STRIPE_PLAN_LABELS ?? '').trim();
  if (!raw) return DEFAULT_PLANS;
  try {
    const parsed = JSON.parse(raw) as StripePlanDisplay[];
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {
    /* use defaults */
  }
  return DEFAULT_PLANS;
}

/** Hosted Checkout only needs Supabase + Edge secrets; publishable key optional (future Payment Element). */
export function isStripeWebBillingConfigured(): boolean {
  if ((process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '').trim()) return true;
  return isSupabaseConfigured();
}

export function getStripeCheckoutReturnBaseUrl(): string {
  const web = getDaltonWebUrl();
  const basePath = (process.env.EXPO_PUBLIC_WEB_BASE_PATH ?? '/app').replace(/\/$/, '');
  if (web) return `${web}${basePath}`;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}${basePath}`;
  }
  return '';
}

export type StartStripeCheckoutResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

/** Mandatory academy access (£2/mo) — configure STRIPE_PRICE_ACCESS_MONTHLY_ID in Supabase secrets. */
export function getAcademyAccessPlanLine(): string {
  return (process.env.EXPO_PUBLIC_ACADEMY_ACCESS_PRICE_LABEL ?? '£2 / month').trim() || '£2 / month';
}

function mapStripeCheckoutError(body: {
  error?: string;
  message?: string;
  hint?: string;
  code?: string;
}): string | null {
  const code = (body.code ?? body.error ?? '').trim();
  const message = (body.message ?? body.error ?? '').trim();
  if (code === 'price_not_configured' || body.error === 'price_not_configured') {
    return 'Checkout is not fully configured yet. Please try again later or contact Support from Profile → Help.';
  }
  if (body.error === 'stripe_not_configured') {
    return 'Payments are not configured on the server yet. Please contact Support from Profile → Help.';
  }
  if (body.hint === 'stripe_mode_mismatch' || /test mode|live mode/i.test(message)) {
    return 'Checkout is temporarily unavailable (billing configuration). Please try again later or contact Support.';
  }
  if (body.error === 'unauthorized' || body.error === 'invalid_token') {
    return 'Your session expired. Sign out, sign back in, and try checkout again.';
  }
  if (message && !/edge function returned|non-2xx|functionshttp/i.test(message)) {
    return message;
  }
  return null;
}

async function readInvokeErrorBody(error: unknown): Promise<Record<string, unknown> | null> {
  const ctx = (error as { context?: Response })?.context;
  if (!ctx || typeof ctx.json !== 'function') return null;
  try {
    return (await ctx.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Creates a Stripe Checkout session via Supabase Edge Function (secret key stays server-side). */
export async function startStripeCheckout(plan: StripePlanKey): Promise<StartStripeCheckoutResult> {
  const supabase = getSupabase();
  if (!supabase) {
    return { ok: false, error: 'Sign in is required before subscribing.' };
  }

  const returnBase = getStripeCheckoutReturnBaseUrl();
  const { data, error } = await supabase.functions.invoke('stripe-create-checkout', {
    body: {
      plan,
      success_url: returnBase ? `${returnBase}?stripe_checkout=success` : undefined,
      cancel_url: returnBase ? `${returnBase}?stripe_checkout=cancel` : undefined,
    },
  });

  if (error) {
    const body = await readInvokeErrorBody(error);
    const mapped = body
      ? mapStripeCheckoutError({
          error: typeof body.error === 'string' ? body.error : undefined,
          message: typeof body.message === 'string' ? body.message : undefined,
          hint: typeof body.hint === 'string' ? body.hint : undefined,
          code: typeof body.code === 'string' ? body.code : undefined,
        })
      : null;
    if (mapped) return { ok: false, error: mapped };
    let detail = error.message || 'Could not start checkout.';
    return { ok: false, error: coerceApiError('start checkout', detail) };
  }

  const payload = (data ?? {}) as { url?: string; error?: string; message?: string; hint?: string; code?: string };
  const url = typeof payload.url === 'string' ? payload.url : '';
  if (!url) {
    const mapped = mapStripeCheckoutError(payload);
    if (mapped) return { ok: false, error: mapped };
    const msg = typeof payload.error === 'string' ? payload.error : 'Checkout URL missing.';
    return { ok: false, error: coerceApiError('start checkout', msg) };
  }

  return { ok: true, url };
}

export function openStripeCheckoutUrl(url: string): void {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.location.assign(url);
    return;
  }
  // Native webview builds could use Linking.openURL(url) if you add expo-linking here later.
}
