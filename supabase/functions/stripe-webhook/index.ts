/**
 * Stripe webhook → `subscription_state` (server truth for mandatory app access).
 *
 * Deploy:
 *   supabase functions deploy stripe-webhook --project-ref <REF>
 *
 * Stripe Dashboard → Developers → Webhooks → Add endpoint:
 *   https://<PROJECT_REF>.supabase.co/functions/v1/stripe-webhook
 * Events: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted
 *
 * Secrets:
 *   STRIPE_SECRET_KEY
 *   STRIPE_WEBHOOK_SECRET   — signing secret from the webhook endpoint (whsec_…)
 *   SUPABASE_SERVICE_ROLE_KEY
 */
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@17.7.0';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, stripe-signature',
};

async function setPremium(
  admin: ReturnType<typeof createClient>,
  userId: string,
  isPro: boolean,
  raw: unknown,
): Promise<void> {
  const entitlementIds = isPro ? ['premium'] : [];
  await admin.from('subscription_state').upsert(
    {
      user_id: userId,
      is_pro: isPro,
      is_payment_verified: isPro,
      entitlement_ids: entitlementIds,
      updated_at: new Date().toISOString(),
      raw: raw as Record<string, unknown>,
    },
    { onConflict: 'user_id' },
  );
}

function userIdFromSubscription(sub: Stripe.Subscription): string | null {
  const meta = sub.metadata?.user_id?.trim();
  if (meta) return meta;
  return null;
}

function userIdFromSession(session: Stripe.Checkout.Session): string | null {
  const meta = session.metadata?.user_id?.trim();
  if (meta) return meta;
  const ref = session.client_reference_id?.trim();
  if (ref) return ref;
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const stripeKey = (Deno.env.get('STRIPE_SECRET_KEY') ?? '').trim();
  const webhookSecrets = [
    Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '',
    Deno.env.get('STRIPE_WEBHOOK_SECRET_ALT') ?? '',
  ]
    .flatMap((s) => s.split(','))
    .map((s) => s.trim())
    .filter((s) => s.startsWith('whsec_'));
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  if (!stripeKey || webhookSecrets.length === 0 || !supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: 'server_misconfigured' }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: '2024-11-20.acacia' });
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return new Response(JSON.stringify({ error: 'missing_signature' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const body = await req.text();
  let event: Stripe.Event | null = null;
  let lastVerifyError = 'signature_verification_failed';
  for (const secret of webhookSecrets) {
    try {
      // Deno Edge requires async crypto (SubtleCrypto); sync constructEvent throws.
      event = await stripe.webhooks.constructEventAsync(body, signature, secret);
      lastVerifyError = '';
      break;
    } catch (err) {
      lastVerifyError = err instanceof Error ? err.message : lastVerifyError;
    }
  }
  if (!event) {
    console.error('[stripe-webhook] signature_verification_failed', lastVerifyError);
    const wrongSecret =
      /signature|No signatures found/i.test(lastVerifyError) &&
      !/SubtleCryptoProvider|constructEventAsync/i.test(lastVerifyError);
    return new Response(
      JSON.stringify({
        error: wrongSecret ? 'invalid_signature' : 'signature_verification_failed',
        stripe_message: lastVerifyError,
        hint: wrongSecret
          ? 'Use the Signing secret from the exact Stripe webhook endpoint (we_…) that delivered this event. Test and live modes have different secrets.'
          : 'Webhook verification failed on the server. Redeploy stripe-webhook if this persists after a fix.',
      }),
      { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
    );
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === 'payment') {
          const purpose = session.metadata?.purpose?.trim();
          const eventId = session.metadata?.event_id?.trim();
          const userId = userIdFromSession(session);
          if (purpose === 'event_ticket' && eventId && userId) {
            const reference = `DG-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
            const { error: bkErr } = await admin.from('bookings').insert({
              event_id: eventId,
              user_id: userId,
              reference,
              stripe_checkout_session_id: session.id,
            });
            if (bkErr && !/unique|duplicate/i.test(bkErr.message)) {
              console.error('[stripe-webhook] event_booking_failed', bkErr.message);
            }
          }
          break;
        }
        if (session.mode !== 'subscription') break;
        const userId = userIdFromSession(session);
        if (!userId) break;
        await setPremium(admin, userId, true, { event: event.type, session });
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        let userId = userIdFromSubscription(sub);
        if (!userId && typeof sub.customer === 'string') {
          const customer = await stripe.customers.retrieve(sub.customer);
          if (!customer.deleted && 'metadata' in customer) {
            userId = customer.metadata?.user_id?.trim() || null;
          }
        }
        if (!userId) break;
        const active =
          sub.status === 'active' || sub.status === 'trialing';
        await setPremium(admin, userId, active, { event: event.type, subscription: sub });
        break;
      }
      default:
        break;
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'webhook_handler_failed';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
