import Stripe from 'npm:stripe@17.7.0';

export type StripeCancelResult = {
  /** Subscription IDs scheduled with cancel_at_period_end. */
  scheduled: string[];
  errors: string[];
};

const ACTIVEISH = new Set(['active', 'trialing', 'past_due', 'unpaid']);

/** Schedule Stripe web subscriptions to end at the current period (not immediate revoke). */
export async function cancelStripeSubscriptionsForUser(
  stripe: Stripe,
  userId: string,
  userEmail?: string | null,
  knownSubscriptionIds: string[] = [],
): Promise<StripeCancelResult> {
  const result: StripeCancelResult = { scheduled: [], errors: [] };
  const customerIds = new Set<string>();

  try {
    const search = await stripe.customers.search({
      query: `metadata['user_id']:'${userId}'`,
      limit: 10,
    });
    for (const c of search.data) customerIds.add(c.id);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'customer_search_failed';
    result.errors.push(msg);
  }

  const email = userEmail?.trim();
  if (email) {
    try {
      const byEmail = await stripe.customers.list({ email, limit: 5 });
      for (const c of byEmail.data) customerIds.add(c.id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'customer_list_failed';
      result.errors.push(msg);
    }
  }

  for (const subId of knownSubscriptionIds) {
    const id = subId.trim();
    if (!id || result.scheduled.includes(id)) continue;
    try {
      const sub = await stripe.subscriptions.retrieve(id);
      if (sub.cancel_at_period_end || sub.status === 'canceled') continue;
      if (!ACTIVEISH.has(sub.status)) continue;
      await stripe.subscriptions.update(id, { cancel_at_period_end: true });
      result.scheduled.push(id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : `cancel_failed_${id}`;
      result.errors.push(msg);
    }
  }

  for (const customerId of customerIds) {
    try {
      const subs = await stripe.subscriptions.list({
        customer: customerId,
        status: 'all',
        limit: 20,
      });
      for (const sub of subs.data) {
        if (sub.cancel_at_period_end || sub.status === 'canceled') continue;
        if (!ACTIVEISH.has(sub.status)) continue;
        await stripe.subscriptions.update(sub.id, { cancel_at_period_end: true });
        result.scheduled.push(sub.id);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : `cancel_failed_${customerId}`;
      result.errors.push(msg);
    }
  }

  return result;
}
