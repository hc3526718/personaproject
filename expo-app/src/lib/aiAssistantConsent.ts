import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

const CONSENT_KEY = 'dalton_ai_assistant_consent_v1';

export const AI_ASSISTANT_PROVIDER = 'Chatbase';
export const AI_ASSISTANT_DISCLOSURE =
  'The AI assistant is powered by Chatbase (a third-party service). Messages you send may be transmitted to Chatbase to generate replies. Do not share passwords, payment card numbers, or other sensitive data. AI replies may be inaccurate — verify important details with human support.';

/** Gate first open of the web AI assistant (App Store 2026 third-party AI disclosure). */
export async function ensureAiAssistantConsent(): Promise<boolean> {
  try {
    const stored = await AsyncStorage.getItem(CONSENT_KEY);
    if (stored === '1') return true;
  } catch {
    /* proceed to prompt */
  }

  return new Promise((resolve) => {
    Alert.alert('AI assistant', `${AI_ASSISTANT_DISCLOSURE}\n\nContinue to the assistant on our website?`, [
      { text: 'Not now', style: 'cancel', onPress: () => resolve(false) },
      {
        text: 'Continue',
        onPress: () => {
          void AsyncStorage.setItem(CONSENT_KEY, '1')
            .catch(() => {})
            .finally(() => resolve(true));
        },
      },
    ]);
  });
}
