import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'dga_signup_pending_email';

export async function saveSignupPendingEmail(email: string): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, email.trim());
  } catch {
    /* non-fatal */
  }
}

export async function readSignupPendingEmail(): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw?.trim() || null;
  } catch {
    return null;
  }
}

export async function clearSignupPendingEmail(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    /* non-fatal */
  }
}
