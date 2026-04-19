import * as Sentry from '@sentry/react-native';

const dsn = (process.env.EXPO_PUBLIC_SENTRY_DSN || '').trim();

let inited = false;

/** Call once at startup (from `index.ts`). No-op when `EXPO_PUBLIC_SENTRY_DSN` is unset. */
export function initSentryFromEnv(): void {
  if (inited || !dsn) return;
  try {
    Sentry.init({
      dsn,
      enableAutoSessionTracking: true,
      tracesSampleRate: __DEV__ ? 1 : 0.12,
      debug: __DEV__,
    });
    inited = true;
  } catch (e) {
    if (__DEV__) console.warn('[Sentry] init failed', e);
  }
}

function sentryEnabled(): boolean {
  return Boolean(dsn && inited);
}

export function captureBootRiveIssue(
  message: string,
  context?: Record<string, string | number | boolean | null | undefined>,
): void {
  if (!sentryEnabled()) return;
  Sentry.withScope((scope) => {
    scope.setTag('area', 'boot_rive');
    if (context) scope.setContext('rive', context as Record<string, unknown>);
    Sentry.captureMessage(message, 'warning');
  });
}

export function captureAuthSessionTimeout(): void {
  if (!sentryEnabled()) return;
  Sentry.withScope((scope) => {
    scope.setTag('area', 'auth');
    Sentry.captureMessage('supabase_get_session_timeout', 'warning');
  });
}
