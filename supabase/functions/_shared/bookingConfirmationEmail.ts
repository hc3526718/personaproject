/**
 * Resend booking confirmation — shared by send-booking-confirmation-email + stripe-webhook.
 */
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function formatEventScheduleLine(
  startsAt: string,
  endsAt: string | null | undefined,
): string {
  const start = new Date(startsAt);
  if (Number.isNaN(start.getTime())) return startsAt;
  const end = endsAt ? new Date(endsAt) : null;
  const dateFmt: Intl.DateTimeFormatOptions = {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  };
  const timeFmt: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };
  const d = start.toLocaleDateString('en-GB', dateFmt);
  const t1 = start.toLocaleTimeString('en-GB', timeFmt);
  const t2 =
    end && !Number.isNaN(end.getTime()) ? end.toLocaleTimeString('en-GB', timeFmt) : null;
  return t2 ? `${d} · ${t1} – ${t2}` : `${d} · ${t1}`;
}

type EventJoin = {
  title?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  venue?: string | null;
};

export type SendBookingEmailResult =
  | { ok: true; skipped?: false }
  | { ok: true; skipped: true; reason: string }
  | { ok: false; error: string };

export async function sendBookingConfirmationEmail(
  admin: SupabaseClient,
  opts: { bookingId: string; userId: string },
): Promise<SendBookingEmailResult> {
  const resendKey = Deno.env.get('RESEND_API_KEY')?.trim();
  const from =
    Deno.env.get('RESEND_FROM_EMAIL')?.trim() ??
    'The Dalton Grant Academy <onboarding@resend.dev>';

  if (!resendKey) {
    console.warn('[booking-email] RESEND_API_KEY not set — skipping');
    return { ok: true, skipped: true, reason: 'resend_not_configured' };
  }

  const { data: booking, error: bkErr } = await admin
    .from('bookings')
    .select(
      'id, reference, user_id, event_id, events ( title, starts_at, ends_at, venue )',
    )
    .eq('id', opts.bookingId)
    .maybeSingle();

  if (bkErr || !booking) {
    return { ok: false, error: bkErr?.message ?? 'booking_not_found' };
  }
  if (booking.user_id !== opts.userId) {
    return { ok: false, error: 'forbidden' };
  }

  const ev = booking.events as EventJoin | EventJoin[] | null;
  const event = Array.isArray(ev) ? ev[0] : ev;
  const title = (event?.title ?? 'Your event').trim() || 'Your event';
  const venue = (event?.venue ?? 'See app for venue').trim() || 'See app for venue';
  const schedule = event?.starts_at
    ? formatEventScheduleLine(event.starts_at, event.ends_at)
    : 'See the app for schedule details';
  const reference = String(booking.reference ?? '').trim();

  const { data: authUser, error: authErr } = await admin.auth.admin.getUserById(opts.userId);
  const toEmail = authUser?.user?.email?.trim();
  if (authErr || !toEmail) {
    console.warn('[booking-email] no recipient email', authErr?.message);
    return { ok: true, skipped: true, reason: 'no_email' };
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('display_name, first_name')
    .eq('id', opts.userId)
    .maybeSingle();

  const greetingName =
    (profile?.first_name as string | null)?.trim() ||
    (profile?.display_name as string | null)?.trim()?.split(/\s+/)[0] ||
    'there';

  const webUrl = (Deno.env.get('DALTON_WEB_URL') ?? 'https://daltongrantacademy.vercel.app').replace(
    /\/$/,
    '',
  );
  const appUrl = `${webUrl}/app`;

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family:system-ui,-apple-system,sans-serif;line-height:1.5;color:#1a1a1a;max-width:560px;margin:0 auto;padding:24px;">
  <p style="color:#c8a84b;font-size:12px;letter-spacing:0.2em;text-transform:uppercase;margin:0 0 8px;">Booking confirmed</p>
  <h1 style="font-size:22px;margin:0 0 16px;">You're registered</h1>
  <p>Hi ${escapeHtml(greetingName)},</p>
  <p>Your spot is confirmed for <strong>${escapeHtml(title)}</strong>.</p>
  <table style="width:100%;border-collapse:collapse;margin:20px 0;">
    <tr><td style="padding:8px 0;color:#666;width:100px;">Reference</td><td style="padding:8px 0;"><strong>${escapeHtml(reference)}</strong></td></tr>
    <tr><td style="padding:8px 0;color:#666;">When</td><td style="padding:8px 0;">${escapeHtml(schedule)}</td></tr>
    <tr><td style="padding:8px 0;color:#666;">Where</td><td style="padding:8px 0;">${escapeHtml(venue)}</td></tr>
  </table>
  <p>Open the app to view your ticket QR code, save it to your device, or add the session to your calendar.</p>
  <p style="margin:28px 0;">
    <a href="${escapeHtml(appUrl)}" style="display:inline-block;background:#c8a84b;color:#0a0a0a;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:8px;">View my ticket</a>
  </p>
  <p style="font-size:13px;color:#666;">Questions? Use Profile → Support in the app or our <a href="${escapeHtml(webUrl)}/contact-us.html" style="color:#c8a84b;">contact page</a>.</p>
  <p style="font-size:12px;color:#999;margin-top:32px;">The Dalton Grant Academy</p>
</body>
</html>`.trim();

  const text = [
    `Hi ${greetingName},`,
    '',
    `You're registered for ${title}.`,
    '',
    `Reference: ${reference}`,
    `When: ${schedule}`,
    `Where: ${venue}`,
    '',
    `View your ticket: ${appUrl}`,
    '',
    'The Dalton Grant Academy',
  ].join('\n');

  const send = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [toEmail],
      subject: `Booking confirmed — ${title}`,
      html,
      text,
    }),
  });

  if (!send.ok) {
    const txt = await send.text();
    console.error('[booking-email] Resend failed', send.status, txt);
    return { ok: false, error: 'resend_failed' };
  }

  return { ok: true };
}
