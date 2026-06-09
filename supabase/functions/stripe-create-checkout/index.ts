/**
 * Creates a Stripe Checkout Session for web Premium (subscription).
 *
 * Deploy:
 *   supabase functions deploy stripe-create-checkout --project-ref <REF>
 *
 * Secrets (Dashboard → Edge Functions → Secrets):
 *   STRIPE_SECRET_KEY
 *   STRIPE_PRICE_MONTHLY_ID   — price_… from Stripe Dashboard
 *   STRIPE_PRICE_ANNUAL_ID    — optional second plan
 *   SUPABASE_SERVICE_ROLE_KEY — already required for other functions
 *
 * Client: supabase.functions.invoke('stripe-create-checkout', { body: { plan: 'monthly' | 'annual' } })
 */
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@17.7.0';
import { corsHeaders } from '../_shared/cors.ts';

type Body = {
  plan?: 'monthly' | 'annual' | 'access';
  mode?: 'subscription' | 'event';
  event_id?: string;
  success_url?: string;
  cancel_url?: string;
};

function priceIdForPlan(plan: 'monthly' | 'annual' | 'access'): string | null {
  if (plan === 'access') {
    return (
      (Deno.env.get('STRIPE_PRICE_ACCESS_MONTHLY_ID') ?? Deno.env.get('STRIPE_PRICE_MONTHLY_ID') ?? '').trim() ||
      null
    );
  }
  if (plan === 'annual') {
    return (Deno.env.get('STRIPE_PRICE_ANNUAL_ID') ?? '').trim() || null;
  }
  return (Deno.env.get('STRIPE_PRICE_MONTHLY_ID') ?? '').trim() || null;
}

Deno.serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  try {
    const stripeKey = (Deno.env.get('STRIPE_SECRET_KEY') ?? '').trim();
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: 'stripe_not_configured' }), {
        status: 503,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    const jwt = authHeader.slice(7);

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ error: 'server_misconfigured' }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: userData, error: authErr } = await admin.auth.getUser(jwt);
    if (authErr || !userData?.user?.id) {
      return new Response(JSON.stringify({ error: 'invalid_token' }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const user = userData.user;
    let body: Body = {};
    try {
      body = (await req.json()) as Body;
    } catch {
      body = {};
    }

    const defaultBase =
      (Deno.env.get('STRIPE_CHECKOUT_BASE_URL') ?? 'https://daltongrantacademy.vercel.app/app').replace(
        /\/$/,
        '',
      );
    const successUrl = (body.success_url ?? `${defaultBase}?stripe_checkout=success`).trim();
    const cancelUrl = (body.cancel_url ?? `${defaultBase}?stripe_checkout=cancel`).trim();

    const stripe = new Stripe(stripeKey, { apiVersion: '2024-11-20.acacia' });

    const checkoutMode = body.mode === 'event' ? 'event' : 'subscription';
    let session: Stripe.Checkout.Session;

    if (checkoutMode === 'event') {
      const eventId = (body.event_id ?? '').trim();
      if (!eventId) {
        return new Response(JSON.stringify({ error: 'event_id_required' }), {
          status: 400,
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }
      const { data: ev, error: evErr } = await admin
        .from('events')
        .select('id, title, requires_payment, stripe_price_id, registered_count, event_details')
        .eq('id', eventId)
        .maybeSingle();
      if (evErr || !ev?.id) {
        return new Response(JSON.stringify({ error: 'event_not_found' }), {
          status: 404,
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }
      const capRaw = (ev.event_details as { capacity?: unknown } | null)?.capacity;
      const cap =
        typeof capRaw === 'number'
          ? capRaw
          : typeof capRaw === 'string'
            ? parseInt(capRaw, 10)
            : NaN;
      const registered = typeof ev.registered_count === 'number' ? ev.registered_count : 0;
      if (Number.isFinite(cap) && cap > 0 && registered >= cap) {
        return new Response(JSON.stringify({ error: 'event_full' }), {
          status: 409,
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }
      const priceId = (ev.stripe_price_id ?? '').trim();
      if (!ev.requires_payment || !priceId) {
        return new Response(JSON.stringify({ error: 'event_not_paid_or_unpriced' }), {
          status: 400,
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }
      session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        client_reference_id: user.id,
        metadata: {
          user_id: user.id,
          event_id: eventId,
          purpose: 'event_ticket',
        },
        ...(user.email ? { customer_email: user.email } : {}),
      });
    } else {
      const plan =
        body.plan === 'annual' ? 'annual' : body.plan === 'access' ? 'access' : 'monthly';
      const priceId = priceIdForPlan(plan);
      if (!priceId) {
        return new Response(JSON.stringify({ error: 'price_not_configured', plan }), {
          status: 503,
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }
      session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        client_reference_id: user.id,
        metadata: { user_id: user.id, plan, purpose: plan === 'access' ? 'academy_access' : 'premium' },
        subscription_data: {
          metadata: { user_id: user.id },
        },
        ...(user.email ? { customer_email: user.email } : {}),
        allow_promotion_codes: true,
      });
    }

    if (!session.url) {
      return new Response(JSON.stringify({ error: 'checkout_url_missing' }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ url: session.url, session_id: session.id }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const stripeErr = e as { type?: string; code?: string; message?: string; statusCode?: number };
    const msg = stripeErr?.message ?? (e instanceof Error ? e.message : 'checkout_failed');
    const hint =
      stripeErr?.code === 'resource_missing' && /test mode|live mode/i.test(msg)
        ? 'stripe_mode_mismatch'
        : undefined;
    const status =
      typeof stripeErr?.statusCode === 'number' && stripeErr.statusCode >= 400 && stripeErr.statusCode < 500
        ? stripeErr.statusCode
        : 500;
    return new Response(
      JSON.stringify({
        error: msg,
        code: stripeErr?.code ?? 'checkout_failed',
        hint,
      }),
      { status, headers: { ...cors, 'Content-Type': 'application/json' } },
    );
  }
});
