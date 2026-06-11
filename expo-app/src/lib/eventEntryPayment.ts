export type EntryPaymentMode = 'none' | 'payment_on_arrival' | 'internal_costs';

/** Shown on every event detail, booking, and confirmation screen. */
export const EVENT_IN_PERSON_PAYMENT_TITLE = 'Pay in person';

export const EVENT_PLATFORM_PAYMENT_DISCLAIMER =
  'The Dalton Grant Academy does not take event payments in the app or on the web. Register to reserve your place — any entry fee is paid in person to the host at the venue.';

export const EVENT_FOOTER_PAYMENT_HINT =
  'No payment through the app — pay the host in person at the venue if a fee applies.';

export function formatEntryPaymentNotice(
  mode: EntryPaymentMode,
  amount?: string | null,
  note?: string | null,
): string | null {
  if (mode === 'payment_on_arrival') {
    const amt = amount?.trim();
    return amt ? `Host requests ${amt} on arrival` : 'Host may request payment on arrival';
  }
  if (mode === 'internal_costs') {
    return 'Free entry — bring payment for any internal costs on the day.';
  }
  return null;
}

export function entryPaymentBlockForDescription(
  mode: EntryPaymentMode,
  amount?: string | null,
  note?: string | null,
): string {
  const line = formatEntryPaymentNotice(mode, amount, note);
  return line ? `\n\n${line}` : '';
}
