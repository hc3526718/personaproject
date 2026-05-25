/**
 * Master PIN verification (bypasses PostgREST RPC when `verify_master_pin` returns 404).
 *
 * Deploy:
 *   supabase functions deploy verify-master-pin --project-ref txehbzyntvqpkkegjrwp
 *
 * Secrets: SUPABASE_SERVICE_ROLE_KEY (same as master-delete-user).
 */
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

type Body = { pin?: string };

Deno.serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  try {
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

    const callerId = userData.user.id;
    let body: Body = {};
    try {
      body = (await req.json()) as Body;
    } catch {
      body = {};
    }

    const pin = typeof body.pin === 'string' ? body.pin.trim() : '';
    if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      return new Response(JSON.stringify({ error: 'bad_request', valid: false }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const { data: profile, error: profErr } = await admin
      .from('profiles')
      .select('master_control, master_pin_hash')
      .eq('id', callerId)
      .maybeSingle();

    if (profErr || !profile || profile.master_control !== 'yes') {
      return new Response(JSON.stringify({ error: 'forbidden', valid: false }), {
        status: 403,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const expected = await sha256Hex(`${pin}${callerId}dalton_master_v1`);
    const valid =
      typeof profile.master_pin_hash === 'string' &&
      profile.master_pin_hash.length > 0 &&
      profile.master_pin_hash === expected;

    if (!valid) {
      return new Response(JSON.stringify({ valid: false }), {
        status: 200,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ valid: true }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'internal_error' }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
