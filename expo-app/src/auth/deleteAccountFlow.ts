import { showAppAlert, showAppPrompt } from '../lib/appAlert';
import { getSupabase } from '../lib/supabase';
import { safeGetSession } from './authSessionRecovery';
import { deleteOwnAccount } from './accountDeletionService';

const DELETE_ACCOUNT_WARNING =
  'This permanently deletes your Dalton Grant Academy account and data stored with us — including profile, bookings, posts, messages, and media uploads tied to this account.\n\n' +
  'Before you delete: if you subscribed to Premium on iPhone, cancel from Apple subscriptions; if you pay on web via Stripe, cancel via the Stripe billing portal and wait for confirmations to settle. Charges are handled by Apple or Stripe — DGA cannot remove them for you after deletion.\n\n' +
  'This action cannot be undone.';

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
  showAppAlert(
    'Account deleted',
    'Your account and data have been permanently removed. You can create a new account anytime from the welcome screen.',
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
          'Enter DELETE in capital letters to permanently delete your account.',
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
