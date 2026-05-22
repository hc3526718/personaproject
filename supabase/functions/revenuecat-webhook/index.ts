/**
 * RevenueCat webhook → `subscription_state` (App Store / Play / RC Web Billing events).
 *
 * Deploy:
 *   supabase functions deploy revenuecat-webhook --project-ref <REF>
 *
 * RevenueCat Dashboard → Integrations → Webhooks → Webhook URL:
 *   https://<PROJECT_REF>.supabase.co/functions/v1/revenuecat-webhook
 *
 * Set the same secret in RC "Authorization header" and Supabase secret:
 *   REVENUECAT_WEBHOOK_AUTHORIZATION   (e.g. a long random string; RC sends Bearer <value>)
 *
 * Also required (auto-injected on deploy):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Optional:
 *   REVENUECAT_ENTITLEMENT_ID=premium   (default: premium)
 */
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ENTITLEMENT_ID = (Deno.env.get('REVENUECAT_ENTITLEMENT_ID') ?? 'premium').trim() || 'premium';

const GRANT_EVENTS = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'UNCANCELLATION',
  'NON_RENEWING_PURCHASE',
  'PRODUCT_CHANGE',
  'SUBSCRIPTION_EXTENDED',
]);

const REVOKE_EVENTS = new Set(['EXPIRATION', 'REFUND']);

async function setPremium(
  admin: ReturnType<typeof createClient>,
  userId: string,
  isPro: boolean,
  raw: unknown,
): Promise<void> {
  const entitlementIds = isPro ? [ENTITLEMENT_ID] : [];
  await admin.from('subscription_state').upsert(
    {
      user_id: userId,
      is_pro: isPro,
      entitlement_ids: entitlementIds,
      updated_at: new Date().toISOString(),
      raw: raw as Record<string, unknown>,
    },
    { onConflict: 'user_id' },
  );
  if (isPro) {
    await admin.from('profiles').update({ dalton_verified: true }).eq('id', userId);
  }
}

function hasPremiumEntitlement(entitlementIds: unknown): boolean {
  if (!Array.isArray(entitlementIds)) return false;
  return entitlementIds.some((id) => String(id) === ENTITLEMENT_ID);
}

function verifyAuthorization(req: Request): boolean {
  const expected = (Deno.env.get('REVENUECAT_WEBHOOK_AUTHORIZATION') ?? '').trim();
  if (!expected) return false;
  const auth = req.headers.get('Authorization') ?? '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7).trim() : auth.trim();
  return bearer === expected;
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

  if (!verifyAuthorization(req)) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: 'server_misconfigured' }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  let payload: { event?: Record<string, unknown> };
  try {
    payload = (await req.json()) as { event?: Record<string, unknown> };
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const event = payload.event;
  if (!event || typeof event !== 'object') {
    return new Response(JSON.stringify({ error: 'missing_event' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const eventType = String(event.type ?? '');
  const appUserId = String(event.app_user_id ?? '').trim();
  if (!appUserId) {
    return new Response(JSON.stringify({ received: true, skipped: 'no_app_user_id' }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const entitlementIds = event.entitlement_ids;
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    if (GRANT_EVENTS.has(eventType) && hasPremiumEntitlement(entitlementIds)) {
      await setPremium(admin, appUserId, true, { source: 'revenuecat', event });
    } else if (REVOKE_EVENTS.has(eventType)) {
      await setPremium(admin, appUserId, false, { source: 'revenuecat', event });
    }
    // CANCELLATION: access often remains until EXPIRATION — do not revoke here.

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
