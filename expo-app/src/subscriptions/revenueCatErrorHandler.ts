/**
 * RevenueCat SDK log handler with Sentry integration.
 * Deduplicates, categorizes, and properly tags RevenueCat errors.
 */

type SentryModule = typeof import('@sentry/react-native');

function loadSentry(): SentryModule | null {
  try {
    return require('@sentry/react-native') as SentryModule;
  } catch {
    return null;
  }
}

function sentryEnabled(): boolean {
  const dsn = (process.env.EXPO_PUBLIC_SENTRY_DSN || '').trim();
  return Boolean(dsn && loadSentry());
}

const KNOWN_OFFERING_ERROR_PATTERNS = [
  'Error fetching offerings',
  'There\'s a problem with your configuration',
  'None of the products registered in the RevenueCat dashboard could be fetched',
  'why-are-offerings-empty',
];

const DEDUPLICATION_WINDOW_MS = 60_000; // Only send one Sentry event per error type per minute
const errorLastReported = new Map<string, number>();

function shouldReportToSentry(fingerprint: string): boolean {
  const now = Date.now();
  const lastReported = errorLastReported.get(fingerprint);
  if (lastReported && now - lastReported < DEDUPLICATION_WINDOW_MS) {
    return false;
  }
  errorLastReported.set(fingerprint, now);
  return true;
}

function isOfferingConfigurationError(message: string): boolean {
  return KNOWN_OFFERING_ERROR_PATTERNS.some((pattern) =>
    message.includes(pattern)
  );
}

/**
 * Capture a RevenueCat error to Sentry with proper context and deduplication.
 * This should be called from the RevenueCat log handler.
 */
export function captureRevenueCatError(
  logLevel: string,
  message: string,
): void {
  if (!sentryEnabled()) return;

  const Sentry = loadSentry();
  if (!Sentry) return;

  const isOfferingError = isOfferingConfigurationError(message);
  const fingerprint = isOfferingError
    ? 'revenuecat_offering_configuration_error'
    : `revenuecat_${logLevel}_${message.slice(0, 50)}`;

  if (!shouldReportToSentry(fingerprint)) {
    return;
  }

  Sentry.withScope((scope) => {
    scope.setTag('revenuecat', 'true');
    scope.setTag('revenuecat_log_level', logLevel);
    scope.setLevel(isOfferingError ? 'warning' : 'error');
    scope.setFingerprint([fingerprint]);

    if (isOfferingError) {
      scope.setTag('revenuecat_error_type', 'offering_configuration');
      scope.setContext('revenuecat', {
        error_type: 'offering_configuration',
        likely_cause: 'App Store Connect products not approved/attached, or product IDs mismatch',
        message,
      });
    } else {
      scope.setContext('revenuecat', {
        log_level: logLevel,
        message,
      });
    }

    Sentry.captureMessage(
      isOfferingError
        ? 'RevenueCat offerings configuration issue'
        : `RevenueCat SDK: ${message}`,
      isOfferingError ? 'warning' : 'error'
    );
  });
}

/**
 * Install RevenueCat log handler that forwards errors to Sentry with proper deduplication.
 */
export function installRevenueCatLogHandler(): void {
  try {
    const Purchases = require('react-native-purchases').default as typeof import('react-native-purchases').default;

    if (Purchases.setLogHandler) {
      Purchases.setLogHandler((logLevel, message) => {
        if (logLevel === 'ERROR' || logLevel === 'WARN') {
          captureRevenueCatError(logLevel, message);
        }
        if (__DEV__) {
          console.log(`[RevenueCat ${logLevel}]`, message);
        }
      });
    }

    if (__DEV__ && Purchases.setLogLevel) {
      Purchases.setLogLevel('DEBUG');
    }
  } catch {
    // Purchases SDK not available (Expo Go, or not installed)
  }
}
