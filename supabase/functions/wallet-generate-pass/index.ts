/**
 * Generate a signed Apple Wallet .pkpass for an event booking.
 *
 * Secrets (Supabase Dashboard → Edge Functions):
 *   APPLE_PASS_TYPE_ID          — e.g. pass.com.grantaccess.event
 *   APPLE_TEAM_ID
 *   APPLE_WWDR_CERT_PEM         — Apple WWDR certificate (PEM)
 *   APPLE_SIGNER_CERT_PEM       — Pass Type ID certificate (PEM)
 *   APPLE_SIGNER_KEY_PEM        — Private key (PEM)
 *   APPLE_SIGNER_KEY_PASSPHRASE — optional
 *   SUPABASE_SERVICE_ROLE_KEY
 */
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { PKPass } from 'npm:passkit-generator@3.5.7';
import { corsHeaders } from '../_shared/cors.ts';

const PASS_TYPE = Deno.env.get('APPLE_PASS_TYPE_ID') ?? 'pass.com.grantaccess.event';
const TEAM_ID = Deno.env.get('APPLE_TEAM_ID') ?? '';

function hasSigningCerts(): boolean {
  return Boolean(
    TEAM_ID &&
      Deno.env.get('APPLE_WWDR_CERT_PEM') &&
      Deno.env.get('APPLE_SIGNER_CERT_PEM') &&
      Deno.env.get('APPLE_SIGNER_KEY_PEM'),
  );
}

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return 'TBA';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'TBA';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(iso: string | null | undefined): string {
  if (!iso) return 'TBA';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'TBA';
  return d.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' });
}

async function buildPassBuffer(opts: {
  serialNumber: string;
  authToken: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  venue: string;
  memberName: string;
  reference: string;
  voided: boolean;
}): Promise<Uint8Array> {
  const webServiceURL = `${Deno.env.get('SUPABASE_URL')?.replace(/\/$/, '')}/functions/v1/wallet-passes`;

  const passJson = {
    formatVersion: 1,
    passTypeIdentifier: PASS_TYPE,
    teamIdentifier: TEAM_ID,
    serialNumber: opts.serialNumber,
    organizationName: 'The Dalton Grant Academy',
    description: 'The Dalton Grant Academy Event',
    logoText: 'The Dalton Grant Academy',
    foregroundColor: 'rgb(212, 208, 200)',
    backgroundColor: 'rgb(10, 10, 10)',
    labelColor: 'rgb(200, 168, 75)',
    voided: opts.voided,
    webServiceURL,
    authenticationToken: opts.authToken,
    eventTicket: {
      primaryFields: [
        {
          key: 'event',
          label: 'EVENT',
          value: opts.voided ? `${opts.eventTitle} — ATTENDED` : opts.eventTitle,
        },
      ],
      secondaryFields: [
        { key: 'date', label: 'DATE', value: opts.eventDate },
        { key: 'time', label: 'TIME', value: opts.eventTime },
      ],
      auxiliaryFields: [
        { key: 'location', label: 'LOCATION', value: opts.venue },
        { key: 'member', label: 'MEMBER', value: opts.memberName },
      ],
      backFields: [
        { key: 'booking_ref', label: 'BOOKING REF', value: opts.reference },
        ...(opts.voided
          ? [{ key: 'thanks', label: 'NOTE', value: 'Thanks for attending. This pass can now be removed.' }]
          : []),
      ],
    },
    barcode: {
      message: opts.reference,
      format: 'PKBarcodeFormatQR',
      messageEncoding: 'iso-8859-1',
    },
  };

  const pass = new PKPass(
    {},
    {
      wwdr: Deno.env.get('APPLE_WWDR_CERT_PEM')!,
      signerCert: Deno.env.get('APPLE_SIGNER_CERT_PEM')!,
      signerKey: Deno.env.get('APPLE_SIGNER_KEY_PEM')!,
      signerKeyPassphrase: Deno.env.get('APPLE_SIGNER_KEY_PASSPHRASE') ?? undefined,
    },
    passJson,
  );

  const buf = pass.getAsBuffer();
  return buf instanceof Uint8Array ? buf : new Uint8Array(buf);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    });
  }

  if (!hasSigningCerts()) {
    return new Response(
      JSON.stringify({
        error: 'not_configured',
        message: 'Apple Wallet signing certificates are not configured on the server.',
      }),
      { status: 503, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
    );
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  const jwt = authHeader.replace(/^Bearer\s+/i, '');
  if (!jwt) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(supabaseUrl, serviceKey);
  const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    });
  }

  const body = (await req.json().catch(() => ({}))) as { bookingId?: string; reference?: string };
  if (!body.bookingId && !body.reference) {
    return new Response(JSON.stringify({ error: 'bookingId or reference required' }), {
      status: 400,
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    });
  }

  let q = admin
    .from('bookings')
    .select('id, reference, user_id, pass_voided, wallet_auth_token, events(title, starts_at, ends_at, venue), profiles(full_name)')
    .eq('user_id', userData.user.id);

  q = body.bookingId ? q.eq('id', body.bookingId) : q.eq('reference', body.reference!);
  const { data: booking, error: bkErr } = await q.maybeSingle();

  if (bkErr || !booking) {
    return new Response(JSON.stringify({ error: 'booking_not_found' }), {
      status: 404,
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    });
  }

  let authToken = (booking as { wallet_auth_token?: string | null }).wallet_auth_token;
  if (!authToken) {
    authToken = randomToken();
    await admin.from('bookings').update({ wallet_auth_token: authToken }).eq('id', booking.id);
  }

  const ev = (booking as { events?: { title?: string; starts_at?: string; ends_at?: string; venue?: string | null } })
    .events;
  const profile = (booking as { profiles?: { full_name?: string | null } }).profiles;
  const voided = Boolean((booking as { pass_voided?: boolean }).pass_voided);

  const passBuffer = await buildPassBuffer({
    serialNumber: booking.id,
    authToken,
    eventTitle: ev?.title ?? 'The Dalton Grant Academy Event',
    eventDate: formatDate(ev?.starts_at),
    eventTime: formatTime(ev?.starts_at),
    venue: ev?.venue?.trim() || 'Venue TBA',
    memberName: profile?.full_name?.trim() || 'Member',
    reference: booking.reference,
    voided,
  });

  return new Response(passBuffer, {
    status: 200,
    headers: {
      ...corsHeaders(req),
      'Content-Type': 'application/vnd.apple.pkpass',
      'Content-Disposition': `attachment; filename="event-${booking.reference}.pkpass"`,
    },
  });
});
