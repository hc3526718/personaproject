import { getSupabase } from './supabase';
import { isSupabaseConfigured } from './env';

type BookingEmailResponse = {
  ok?: boolean;
  skipped?: boolean;
  reason?: string | null;
  error?: string;
};

/**
 * Fire-and-forget booking confirmation email (Resend via Edge Function).
 * Non-fatal: booking succeeds even if email fails or Resend is not configured.
 */
export async function notifyBookingConfirmationEmail(opts: {
  bookingId: string;
  reference?: string;
}): Promise<void> {
  const supabase = getSupabase();
  if (!supabase || !isSupabaseConfigured()) return;

  try {
    const { data, error } = await supabase.functions.invoke<BookingEmailResponse>(
      'send-booking-confirmation-email',
      {
        body: {
          booking_id: opts.bookingId,
          ...(opts.reference ? { reference: opts.reference } : {}),
        },
      },
    );

    if (error) {
      if (__DEV__) {
        console.warn('[booking-email]', error.message, data ?? '');
      }
      return;
    }

    if (data?.skipped && __DEV__) {
      console.warn('[booking-email] skipped:', data.reason ?? 'unknown');
    }
  } catch (e) {
    if (__DEV__) {
      console.warn('[booking-email]', e instanceof Error ? e.message : e);
    }
  }
}
