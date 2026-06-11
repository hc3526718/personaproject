/**
 * Booking confirmation emails are disabled until Resend is configured for production.
 * Sign-up / account confirmation emails still flow via Supabase Auth (send-auth-email hook).
 */
export async function notifyBookingConfirmationEmail(_opts: {
  bookingId: string;
  reference?: string;
}): Promise<void> {
  /* intentionally no-op */
}
