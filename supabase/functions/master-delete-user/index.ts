/**
 * Master-only account deletion (Auth Admin API).
 *
 * Deploy (requires [Supabase CLI](https://supabase.com/docs/guides/cli)):
 *   cd /path/to/repo   # repo root containing `/supabase`
 *   supabase login
 *   supabase link --project-ref <YOUR_PROJECT_REF>   # from Dashboard → Settings → General
 *   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<service_role_key>   # Dashboard → Settings → API
 *   supabase functions deploy master-delete-user --project-ref <YOUR_PROJECT_REF>
 *
 * Or use Dashboard → Edge Functions → Deploy from Git connected repo.
 *
 * Secrets for this function:
 *   SUPABASE_SERVICE_ROLE_KEY — required for auth.admin.deleteUser (never put this in Expo).
 *
 * PIN must match profiles.master_pin_hash (same construction as `verify_master_pin` in SQL).
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

type Body = { target_user_id?: string; pin?: string };

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
    let body: Body;
    try {
      body = (await req.json()) as Body;
    } catch {
      return new Response(JSON.stringify({ error: 'invalid_json' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const targetId = typeof body.target_user_id === 'string' ? body.target_user_id.trim() : '';
    const pin = typeof body.pin === 'string' ? body.pin.trim() : '';
    if (!targetId || pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      return new Response(JSON.stringify({ error: 'bad_request' }), {
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
      return new Response(JSON.stringify({ error: 'forbidden' }), {
        status: 403,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const expected = await sha256Hex(`${pin}${callerId}dalton_master_v1`);
    if (
      typeof profile.master_pin_hash !== 'string' ||
      !profile.master_pin_hash ||
      profile.master_pin_hash !== expected
    ) {
      return new Response(JSON.stringify({ error: 'invalid_pin' }), {
        status: 403,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      req.headers.get('x-real-ip') ??
      null;

    const { error: auditErr } = await admin.from('security_audit_log').insert({
      action: 'master_delete_user',
      actor_user_id: callerId,
      target_user_id: targetId,
      client_ip: clientIp,
      metadata: {
        user_agent: req.headers.get('user-agent') ?? null,
        origin: req.headers.get('origin') ?? null,
      },
    });
    if (auditErr) {
      console.error('[master-delete-user] audit_log_failed', auditErr.message);
    } else {
      console.error('[master-delete-user] audit', {
        actor: callerId,
        target: targetId,
        client_ip: clientIp,
      });
    }

    const { error: delErr } = await admin.auth.admin.deleteUser(targetId);
    if (delErr) {
      return new Response(JSON.stringify({ error: delErr.message }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
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
