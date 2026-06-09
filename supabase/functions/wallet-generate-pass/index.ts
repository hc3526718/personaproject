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
  'https://daltongrantacademy.vercel.app',
  'https://www.daltongrantacademy.vercel.app',
  'https://dalton-access.vercel.app',
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

  const icon1 = Uint8Array.from(atob(ICON_B64_1X), (c) => c.charCodeAt(0));
  const icon2 = Uint8Array.from(atob(ICON_B64_2X), (c) => c.charCodeAt(0));
  const icon3 = Uint8Array.from(atob(ICON_B64_3X), (c) => c.charCodeAt(0));

  const certs = signingCerts();
  if (!certs) {
    throw new Error('Apple signing certificates are not configured.');
  }

  const pass = new PKPass(
    {
      'icon.png': icon1,
      'icon@2x.png': icon2,
      'icon@3x.png': icon3,
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

// PassKit required icons (29px @1x/2x/3x) — baked in to keep deploy self-contained.
// Generated from `expo-app/assets/dalton_logo_final_img-icons/iOS/Icon-29*.png`.
const ICON_B64_1X =
  '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';
const ICON_B64_2X =
  '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';
const ICON_B64_3X =
  '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';

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
