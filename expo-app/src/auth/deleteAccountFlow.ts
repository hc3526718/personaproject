import { Platform } from 'react-native';
import { showAppAlert, showAppPrompt } from '../lib/appAlert';
import { getSupabase } from '../lib/supabase';
import { safeGetSession } from './authSessionRecovery';
import { deleteOwnAccount } from './accountDeletionService';

const DELETE_ACCOUNT_WARNING_WEB =
  'This permanently deletes your Dalton Grant Academy account and data stored with us — including profile, bookings, posts, messages, and media uploads tied to this account.\n\n' +
  'If you pay for Premium on the web via Stripe, your subscription will be scheduled to cancel at the end of the current billing period when you delete. You will not be charged again after that period, but this cannot be undone and we cannot refund the current period.\n\n' +
  'This action cannot be undone.';

const DELETE_ACCOUNT_WARNING_NATIVE =
  'This permanently deletes your Dalton Grant Academy account and data stored with us — including profile, bookings, posts, messages, and media uploads tied to this account.\n\n' +
  'IMPORTANT — Apple / Google subscriptions: deleting your account does NOT cancel App Store or Google Play billing. You must cancel yourself in iOS Settings → Subscriptions (or Google Play → Subscriptions) before or immediately after deletion. The Dalton Grant Academy is not liable for any charges that continue if you delete without cancelling with Apple or Google.\n\n' +
  'This action cannot be undone.';

const DELETE_ACCOUNT_WARNING =
  Platform.OS === 'web' ? DELETE_ACCOUNT_WARNING_WEB : DELETE_ACCOUNT_WARNING_NATIVE;

async function confirmDeletePhrase(phrase: string, onDeleted: () => void | Promise<void>) {
  const client = getSupabase();
  if (!client) return;
  const session = await safeGetSession(client);
  const token = session?.access_token;
  if (!token) {
    showAppAlert('Delete account', 'Session expired. Sign in again and retry.');
    return;
  }
  const result = await deleteOwnAccount(token, phrase);
  if (!result.ok) {
    showAppAlert('Could not delete account', result.message);
    return;
  }
  await onDeleted();
  if (Platform.OS === 'web') {
    const scheduled = result.stripeSubscriptionsScheduled?.length ?? 0;
    const stripeNote =
      scheduled > 0
        ? ` Your Stripe subscription is scheduled to end at the close of the current billing period (${scheduled} subscription${scheduled === 1 ? '' : 's'}).`
        : '';
    showAppAlert(
      'Account deleted',
      `Your account and data have been permanently removed.${stripeNote} You can create a new account anytime from the welcome screen.`,
      [{ text: 'OK' }],
    );
    return;
  }
  showAppAlert(
    'Account deleted — cancel your subscription',
    'Your account has been deleted. If you subscribed through Apple or Google, open your device subscription settings now and cancel Premium to avoid future charges. The Dalton Grant Academy is not liable for payments that continue after account deletion if you did not cancel with Apple or Google.',
    [{ text: 'OK' }],
  );
}

/** Two-step delete: warning alert → type DELETE prompt → API delete → sign out. Works on web and native. */
export function startDeleteAccountFlow(onDeleted: () => void | Promise<void>) {
  showAppAlert('Delete account', DELETE_ACCOUNT_WARNING, [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Continue',
      style: 'destructive',
      onPress: () => {
        showAppPrompt(
          'Type DELETE to confirm',
          'Enter DELETE in capital letters to permanently delete your account. This cannot be undone.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete account',
              style: 'destructive',
              onPress: (text?: string) => void confirmDeletePhrase(text ?? '', onDeleted),
            },
          ],
          'plain-text',
          '',
        );
      },
    },
  ]);
}
