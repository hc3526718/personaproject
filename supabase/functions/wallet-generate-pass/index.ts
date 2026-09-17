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
 *   TICKET_HMAC_SECRET          — server-only secret for booking QR tokens
 */
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { PKPass } from 'npm:passkit-generator@3.5.7';

const DEFAULT_ORIGINS = [
  'https://daltongrantacademy.uk',
  'https://www.daltongrantacademy.uk',
  'http://localhost:8081',
  'http://localhost:19006',
  'http://localhost:3000',
  'http://127.0.0.1:8081',
  'http://127.0.0.1:3000',
];

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? '';
  const extra = (Deno.env.get('ALLOWED_CORS_ORIGINS') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const allowed = [...DEFAULT_ORIGINS, ...extra];
  const match = allowed.includes(origin) ? origin : allowed[0];
  return {
    'Access-Control-Allow-Origin': match,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  };
}

const PASS_TYPE = Deno.env.get('APPLE_PASS_TYPE_ID') ?? 'pass.com.grantaccess.event';
const TEAM_ID = Deno.env.get('APPLE_TEAM_ID') ?? '';
const TICKET_SECRET = (Deno.env.get('TICKET_HMAC_SECRET') ?? '').trim();

/** Supabase secrets often store PEMs with literal `\\n` instead of real newlines. */
function normalizePem(raw: string | undefined | null): string {
  const s = (raw ?? '').trim();
  if (!s) return '';
  if (s.includes('-----BEGIN') && !s.includes('\n') && s.includes('\\n')) {
    return s.replace(/\\n/g, '\n');
  }
  return s;
}

function signingCerts(): { wwdr: string; signerCert: string; signerKey: string; passphrase?: string } | null {
  const wwdr = normalizePem(Deno.env.get('APPLE_WWDR_CERT_PEM'));
  const signerCert = normalizePem(Deno.env.get('APPLE_SIGNER_CERT_PEM'));
  const signerKey = normalizePem(Deno.env.get('APPLE_SIGNER_KEY_PEM'));
  if (!TEAM_ID || !wwdr || !signerCert || !signerKey) return null;
  const passphrase = Deno.env.get('APPLE_SIGNER_KEY_PASSPHRASE')?.trim();
  return { wwdr, signerCert, signerKey, passphrase: passphrase || undefined };
}

function hasSigningCerts(): boolean {
  return signingCerts() !== null;
}

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function toBase64Utf8(s: string): string {
  // Match app token encoding: btoa(unescape(encodeURIComponent(s)))
  return btoa(unescape(encodeURIComponent(s)));
}

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, '0')).join('');
}

async function signTicketToken(payload: {
  v: 1;
  ref: string;
  uid: string;
  eventId?: string;
  exp: number;
}): Promise<string> {
  if (!TICKET_SECRET) {
    throw new Error('Ticket signing secret is not configured.');
  }
  const json = JSON.stringify(payload);
  const payloadB64 = toBase64Utf8(json);
  const sig = await sha256Hex(`${TICKET_SECRET}.${payloadB64}`);
  return `${payloadB64}.${sig}`;
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
  qrToken: string;
  voided: boolean;
}): Promise<Uint8Array> {
  const webServiceURL = `${Deno.env.get('SUPABASE_URL')?.replace(/\/$/, '')}/functions/v1/wallet-passes`;

  const icon1 = await Deno.readFile(new URL('./assets/icon.png', import.meta.url));
  const icon2 = await Deno.readFile(new URL('./assets/icon@2x.png', import.meta.url));
  const icon3 = await Deno.readFile(new URL('./assets/icon@3x.png', import.meta.url));
  const logo1 = await Deno.readFile(new URL('./assets/logo.png', import.meta.url));
  const logo2 = await Deno.readFile(new URL('./assets/logo@2x.png', import.meta.url));
  const logo3 = await Deno.readFile(new URL('./assets/logo@3x.png', import.meta.url));

  const certs = signingCerts();
  if (!certs) {
    throw new Error('Apple signing certificates are not configured.');
  }

  const pass = new PKPass(
    {
      'icon.png': icon1,
      'icon@2x.png': icon2,
      'icon@3x.png': icon3,
      'logo.png': logo1,
      'logo@2x.png': logo2,
      'logo@3x.png': logo3,
    },
    {
      wwdr: certs.wwdr,
      signerCert: certs.signerCert,
      signerKey: certs.signerKey,
      signerKeyPassphrase: certs.passphrase,
    },
    {
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
    },
  );

  // passkit-generator v3: type + fields must be set via API, not pass.json overrides.
  pass.type = 'eventTicket';
  pass.primaryFields.push({
    key: 'event',
    label: 'EVENT',
    value: opts.voided ? `${opts.eventTitle} — ATTENDED` : opts.eventTitle,
  });
  pass.secondaryFields.push(
    { key: 'date', label: 'DATE', value: opts.eventDate },
    { key: 'time', label: 'TIME', value: opts.eventTime },
  );
  pass.auxiliaryFields.push(
    { key: 'location', label: 'LOCATION', value: opts.venue },
    { key: 'member', label: 'MEMBER', value: opts.memberName },
  );
  pass.backFields.push({ key: 'booking_ref', label: 'BOOKING REF', value: opts.reference });
  if (opts.voided) {
    pass.backFields.push({
      key: 'thanks',
      label: 'NOTE',
      value: 'Thanks for attending. This pass can now be removed.',
    });
  }
  pass.setBarcodes({
    message: opts.qrToken,
    format: 'PKBarcodeFormatQR',
    messageEncoding: 'iso-8859-1',
  });

  const buf = pass.getAsBuffer();
  return buf instanceof Uint8Array ? buf : new Uint8Array(buf);
}

function jsonError(
  req: Request,
  status: number,
  error: string,
  message: string,
  stage: string,
): Response {
  return new Response(JSON.stringify({ error, message, stage }), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  });
}


Deno.serve(async (req) => {
  try {
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
    return jsonError(
      req,
      503,
      'not_configured',
      'Apple Wallet signing certificates are not configured on the server.',
      'cert_check',
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

  try {
    const body = (await req.json().catch(() => ({}))) as { bookingId?: string; reference?: string };
    if (!body.bookingId && !body.reference) {
      return new Response(JSON.stringify({ error: 'bookingId or reference required' }), {
        status: 400,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    let q = admin
      .from('bookings')
      .select('id, reference, user_id, event_id, pass_voided, wallet_auth_token, events(title, starts_at, ends_at, venue), profiles(display_name, first_name, last_name, username)')
      .eq('user_id', userData.user.id);

    q = body.bookingId ? q.eq('id', body.bookingId) : q.eq('reference', body.reference!);
    const { data: booking, error: bkErr } = await q.maybeSingle();

    if (bkErr) {
      console.error('[wallet-generate-pass] booking_query_failed', bkErr.message);
      return new Response(
        JSON.stringify({
          error: 'booking_query_failed',
          message: 'Could not load your booking.',
          stage: 'booking_query',
        }),
        { status: 500, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
      );
    }

    if (!booking) {
      return new Response(JSON.stringify({ error: 'booking_not_found', message: 'Booking not found for this account.' }), {
        status: 404,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    let authToken = (booking as { wallet_auth_token?: string | null }).wallet_auth_token;
    if (!authToken) {
      authToken = randomToken();
      const { error: tokenErr } = await admin
        .from('bookings')
        .update({ wallet_auth_token: authToken })
        .eq('id', booking.id);
      if (tokenErr) {
        console.error('[wallet-generate-pass] wallet_auth_token_update_failed', tokenErr.message);
        return new Response(
          JSON.stringify({
            error: 'wallet_token_update_failed',
            message: 'Could not prepare your pass.',
            stage: 'wallet_auth_token',
          }),
          { status: 500, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
        );
      }
    }

    const ev = (booking as { events?: { title?: string; starts_at?: string; ends_at?: string; venue?: string | null } })
      .events;
    const profile = (booking as {
      profiles?: {
        display_name?: string | null;
        first_name?: string | null;
        last_name?: string | null;
        username?: string | null;
      };
    }).profiles;
    const voided = Boolean((booking as { pass_voided?: boolean }).pass_voided);

    const memberName =
      profile?.display_name?.trim() ||
      `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim() ||
      (profile?.username?.trim() ? `@${profile.username.trim()}` : '') ||
      'Member';

    if (!TICKET_SECRET) {
      console.error('[wallet-generate-pass] ticket_secret_missing');
      return new Response(
        JSON.stringify({
          error: 'ticket_secret_missing',
          message: 'Ticket signing is not configured on the server (TICKET_HMAC_SECRET).',
          stage: 'ticket_signing',
        }),
        { status: 500, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
      );
    }

    let qrToken: string;
    try {
      qrToken = await signTicketToken({
        v: 1,
        ref: booking.reference,
        uid: userData.user.id,
        eventId: (booking as { event_id?: string | null }).event_id ?? undefined,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'ticket_sign_failed';
      console.error('[wallet-generate-pass] ticket_sign_failed', msg);
      return new Response(
        JSON.stringify({
          error: 'ticket_sign_failed',
          message: 'Could not sign the ticket QR for this pass.',
          stage: 'ticket_signing',
        }),
        { status: 500, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
      );
    }

    let passBuffer: Uint8Array;
    try {
      passBuffer = await buildPassBuffer({
        serialNumber: booking.id,
        authToken,
        eventTitle: ev?.title ?? 'The Dalton Grant Academy Event',
        eventDate: formatDate(ev?.starts_at),
        eventTime: formatTime(ev?.starts_at),
        venue: ev?.venue?.trim() || 'Venue TBA',
        memberName,
        reference: booking.reference,
        qrToken,
        voided,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'pass_sign_failed';
      console.error('[wallet-generate-pass] pass_signing_failed', msg);
      return jsonError(
        req,
        500,
        'pass_signing_failed',
        `Apple pass signing failed: ${msg}`,
        'pass_signing',
      );
    }

    return new Response(passBuffer, {
      status: 200,
      headers: {
        ...corsHeaders(req),
        'Content-Type': 'application/vnd.apple.pkpass',
        'Content-Disposition': `attachment; filename="event-${booking.reference}.pkpass"`,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unexpected_error';
    console.error('[wallet-generate-pass] unhandled', msg);
    return jsonError(req, 500, 'pass_generation_failed', `Unexpected error: ${msg}`, 'unhandled');
  }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'worker_error';
    console.error('[wallet-generate-pass] outer', msg);
    return jsonError(req, 500, 'pass_generation_failed', msg, 'outer');
  }
});
