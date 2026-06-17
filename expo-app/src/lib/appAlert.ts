import { Alert, Platform } from 'react-native';

export type AppAlertButton = {
  text?: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: (value?: string) => void;
};

type AlertBridge = {
  alert: (title: string, message?: string, buttons?: AppAlertButton[]) => void;
  prompt: (
    title: string,
    message?: string,
    buttons?: AppAlertButton[],
    type?: 'default' | 'plain-text' | 'secure-text',
    defaultValue?: string,
  ) => void;
};

let nativeAlert: ((title: string, message?: string, buttons?: AppAlertButton[]) => void) | null = null;
let nativePrompt:
  | ((
      title: string,
      message?: string,
      buttons?: AppAlertButton[],
      type?: 'default' | 'plain-text' | 'secure-text',
      defaultValue?: string,
    ) => void)
  | null = null;

let bridge: AlertBridge | null = null;

export function registerAppAlertBridge(next: AlertBridge | null): void {
  bridge = next;
}

function looksLikeErrorAlert(title: string, message?: string): boolean {
  const blob = `${title} ${message ?? ''}`.toLowerCase();
  if (
    /could not|unable to|failed|error|invalid|violates|constraint|fkey|23503|request failed|network error|not configured/i.test(
      blob,
    )
  ) {
    return true;
  }
  return Boolean(message && /[A-Z]{2,}_[a-z_]+|sql|jwt|token|status \(\d{3}\)/i.test(message));
}

/** User-facing copy for technical failures — keeps title context, hides codes/SQL. */
export function supportErrorMessage(title: string, message?: string): string {
  const t = title.toLowerCase();
  let action = 'complete this step';
  if (t.includes('profile') || t.includes('save')) action = 'save your profile';
  else if (t.includes('delete')) action = 'delete your account';
  else if (t.includes('password')) action = 'update your password';
  else if (t.includes('sign in') || t.includes('log in')) action = 'sign you in';
  else if (t.includes('username')) action = 'set your username';
  else if (t.includes('upload') || t.includes('media')) action = 'upload media';
  else if (t.includes('event')) action = 'update this event';
  else if (t.includes('post')) action = 'update this post';

  if (looksLikeErrorAlert(title, message)) {
    return `We couldn't ${action}. Please try again or contact Support from Profile → Help if this continues.`;
  }
  return message ?? '';
}

const SUPPORT_SUFFIX =
  'Please try again or contact Support from Profile → Help if this continues.';

/** Generic user-facing copy for a failed action (no codes or SQL). */
export function userFacingErrorBody(contextAction: string): string {
  return `We couldn't ${contextAction}. ${SUPPORT_SUFFIX}`;
}

/**
 * Prefer curated copy when present; otherwise return generic support text for technical/API errors.
 */
export function coerceApiError(contextAction: string, raw?: string | null): string {
  const trimmed = raw?.trim();
  if (trimmed && !looksLikeErrorAlert('Error', trimmed)) {
    return trimmed;
  }
  return userFacingErrorBody(contextAction);
}

export function sanitizeErrorForUser(
  raw: unknown,
  contextAction: string,
): string {
  const msg =
    raw instanceof Error
      ? raw.message
      : typeof raw === 'string'
        ? raw
        : raw != null && typeof (raw as { message?: string }).message === 'string'
          ? (raw as { message: string }).message
          : undefined;
  return coerceApiError(contextAction, msg);
}

export function showAppAlert(title: string, message?: string, buttons?: AppAlertButton[]): void {
  const displayMessage = looksLikeErrorAlert(title, message)
    ? supportErrorMessage(title, message)
    : message;

  if (bridge) {
    bridge.alert(title, displayMessage, buttons);
    return;
  }

  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.alert(displayMessage ? `${title}\n\n${displayMessage}` : title);
      const primary = buttons?.find((b) => b.style !== 'cancel') ?? buttons?.[0];
      primary?.onPress?.();
    }
    return;
  }

  if (bridge) {
    bridge.alert(title, displayMessage, buttons);
    return;
  }

  const alertFn = nativeAlert ?? Alert.alert.bind(Alert);
  alertFn(title, displayMessage, buttons);
}

export function showAppPrompt(
  title: string,
  message?: string,
  buttons?: AppAlertButton[],
  type: 'default' | 'plain-text' | 'secure-text' = 'plain-text',
  defaultValue = '',
): void {
  if (bridge) {
    bridge.prompt(title, message, buttons, type, defaultValue);
    return;
  }

  if (Platform.OS === 'ios' && nativePrompt && !bridge) {
    nativePrompt(title, message, buttons, type, defaultValue);
    return;
  }

  if (bridge) {
    bridge.prompt(title, message, buttons, type, defaultValue);
    return;
  }

  if (nativePrompt) {
    nativePrompt(title, message, buttons, type, defaultValue);
    return;
  }

  Alert.alert(title, message, buttons);
}

export function showSupportError(title: string, contextAction?: string): void {
  const action = contextAction ?? 'complete this step';
  showAppAlert(
    title,
    `We couldn't ${action}. Please try again or contact Support from Profile → Help if this continues.`,
    [{ text: 'OK' }],
  );
}

/** Route native Alert.alert / Alert.prompt through branded modals when the bridge is installed. */
export function installNativeAlertBridge(): void {
  if (Platform.OS === 'web' || nativeAlert) return;

  nativeAlert = Alert.alert.bind(Alert);
  nativePrompt =
    typeof Alert.prompt === 'function' ? Alert.prompt.bind(Alert) : null;

  Alert.alert = ((title: string, message?: string, buttons?: AppAlertButton[]) => {
    showAppAlert(title, message, buttons);
  }) as typeof Alert.alert;

  if (nativePrompt) {
    Alert.prompt = ((
      title: string,
      message?: string,
      buttons?: AppAlertButton[],
      type?: 'default' | 'plain-text' | 'secure-text',
      defaultValue?: string,
    ) => {
      showAppPrompt(title, message, buttons, type, defaultValue);
    }) as typeof Alert.prompt;
  }
}
