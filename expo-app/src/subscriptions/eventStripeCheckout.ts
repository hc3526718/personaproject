import { Linking, Platform } from 'react-native';

export type StartEventCheckoutResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

/** Event tickets are paid in person — platform Stripe checkout is disabled. */
export async function startEventStripeCheckout(
  _eventId: string,
): Promise<StartEventCheckoutResult> {
  return {
    ok: false,
    error:
      'Event payments are not taken in the app. Register to reserve your place and pay the host in person at the venue.',
  };
}

export function openEventCheckoutUrl(url: string): void {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.location.assign(url);
    return;
  }
  void Linking.openURL(url);
}
