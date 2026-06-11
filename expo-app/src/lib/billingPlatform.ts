import { fetchSubscriptionStateRow } from '../subscriptions/subscriptionStateService';

export type BillingPlatform = 'stripe' | 'apple' | 'google' | 'unknown';

/** Infer where the user's subscription was purchased (Stripe vs app stores). */
export async function resolveBillingPlatform(): Promise<BillingPlatform> {
  const row = await fetchSubscriptionStateRow();
  if (!row?.raw) return 'unknown';
  const blob = JSON.stringify(row.raw).toLowerCase();
  if (blob.includes('stripe') || blob.includes('checkout.session')) return 'stripe';
  if (blob.includes('app_store') || blob.includes('app store')) return 'apple';
  if (blob.includes('play_store') || blob.includes('play store')) return 'google';
  return 'unknown';
}
