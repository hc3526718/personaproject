import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import type { CustomerInfo, PurchasesOffering } from 'react-native-purchases';
import { getRevenueCatEntitlementId, getRevenueCatOfferingIdentifier } from '../lib/env';
import { installRevenueCatLogHandler } from './revenueCatErrorHandler';

const ENTITLEMENT_PREMIUM = getRevenueCatEntitlementId();

/** RC dashboard may use `premium` or `Grant Access Pro` — treat both as premium. */
const PREMIUM_ENTITLEMENT_KEYS = [
  ENTITLEMENT_PREMIUM,
  'Grant Access Pro',
  'premium',
].filter((k, i, arr) => arr.indexOf(k) === i);

/** RevenueCat **terminates store-signed apps** that call `configure` with a Test Store `test_` key. */
function isAllowedRevenueCatApiKey(key: string): boolean {
  const trimmed = key.trim();
  if (!trimmed) return false;
  if (__DEV__) return true;
  if (trimmed.startsWith('test_')) return false;
  if (Platform.OS === 'ios' && !trimmed.startsWith('appl_')) return false;
  if (Platform.OS === 'android' && !trimmed.startsWith('goog_')) return false;
  return true;
}

function getRevenueCatKeysForPlatform(): { ios: string; android: string } {
  const fromEnvIos = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS?.trim() ?? '';
  const fromEnvAndroid = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID?.trim() ?? '';
  const expoConfig = Constants.expoConfig as Record<string, unknown> | null | undefined;
  const extra = expoConfig?.extra as Record<string, unknown> | undefined;
  const fromExtraIos =
    typeof extra?.revenueCatApiKeyIos === 'string' ? extra.revenueCatApiKeyIos.trim() : '';
  const fromExtraAndroid =
    typeof extra?.revenueCatApiKeyAndroid === 'string' ? extra.revenueCatApiKeyAndroid.trim() : '';
  return {
    ios: fromEnvIos || fromExtraIos,
    android: fromEnvAndroid || fromExtraAndroid,
  };
}

function isExpoGo(): boolean {
  return (
    Constants.appOwnership === 'expo' ||
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient
  );
}

type PurchasesModule = typeof import('react-native-purchases').default;

/** True after `Purchases.configure` succeeded — RevenueCatUI asserts if paywall runs before this. */
let purchasesSdkConfigured = false;

/** Avoid `logOut()` on cold start before any `logIn` (can fatal in release when RC is configured). */
let lastIdentifiedAppUserId: string | null = null;

/** True after log handler is installed (only install once). */
let logHandlerInstalled = false;

/**
 * Never `import` Purchases at module scope — that loads the native module and breaks **Expo Go**.
 */
function tryPurchases(): PurchasesModule | null {
  if (isExpoGo()) return null;
  try {
    return require('react-native-purchases').default as PurchasesModule;
  } catch {
    return null;
  }
}

export function isRevenueCatSdkConfigured(): boolean {
  return purchasesSdkConfigured;
}

/**
 * Configures the native Purchases SDK. Safe to call multiple times — configures once, then no-ops.
 * @returns whether the SDK is ready for `getCustomerInfo` / RevenueCat UI (false in Expo Go or missing API key / configure error).
 */
export async function initRevenueCat(): Promise<boolean> {
  if (purchasesSdkConfigured) return true;
  const Purchases = tryPurchases();
  if (!Purchases) return false;
  const { ios, android } = getRevenueCatKeysForPlatform();
  const key = Platform.OS === 'ios' ? ios : android;
  if (!key || !isAllowedRevenueCatApiKey(key)) {
    if (__DEV__ && key) console.warn('[RevenueCat] skipping configure — invalid key for this platform/build');
    return false;
  }
  try {
    if (!logHandlerInstalled) {
      installRevenueCatLogHandler();
      logHandlerInstalled = true;
    }
    Purchases.configure({ apiKey: key });
    purchasesSdkConfigured = true;
    return true;
  } catch (e) {
    if (__DEV__) console.warn('[RevenueCat] configure failed', e);
    return false;
  }
}

export type FetchOfferingResult =
  | { success: true; offering: PurchasesOffering }
  | { success: false; error: 'not_configured' | 'network_error' | 'no_offerings' | 'unknown'; errorMessage?: string };

/**
 * Offering used by RevenueCat Paywall UI. Prefer `EXPO_PUBLIC_REVENUECAT_OFFERING_IDENTIFIER`
 * (RevenueCat **lookup key**, e.g. `Official Offering`); otherwise try that id; else dashboard **current**.
 *
 * Important: if the dashboard **current** offering still points at **Test Store** products while your
 * paywall design uses **App Store** SKUs, you must either mark the App Store offering as current **or**
 * set this env so `presentPaywall({ offering })` loads StoreKit prices for the right products.
 * 
 * @returns Result with offering on success, or error details for graceful handling.
 */
export async function fetchOfferingForPaywall(): Promise<FetchOfferingResult> {
  const Purchases = tryPurchases();
  if (!Purchases) {
    return { success: false, error: 'not_configured' };
  }

  const configured = await initRevenueCat();
  if (!configured) {
    return { success: false, error: 'not_configured' };
  }

  const fromEnv = getRevenueCatOfferingIdentifier();
  const preferredKeys = [
    ...(fromEnv ? [fromEnv] : []),
    'Official Offering',
  ];

  try {
    const offerings = await Purchases.getOfferings();
    
    // Try preferred offerings first
    for (const key of preferredKeys) {
      const o = offerings.all[key];
      if (o) {
        return { success: true, offering: o };
      }
    }
    
    // Fall back to current offering
    if (offerings.current) {
      return { success: true, offering: offerings.current };
    }

    // No offerings available
    return { 
      success: false, 
      error: 'no_offerings',
      errorMessage: 'No offerings configured in RevenueCat dashboard or products not available from App Store Connect'
    };
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    const isNetworkError = errorMessage.toLowerCase().includes('network') || 
                          errorMessage.toLowerCase().includes('timeout') ||
                          errorMessage.toLowerCase().includes('connection');
    
    return { 
      success: false, 
      error: isNetworkError ? 'network_error' : 'unknown',
      errorMessage
    };
  }
}

/** @deprecated Use fetchOfferingForPaywall instead for better error handling */
export async function fetchOfferingForPaywallLegacy(): Promise<PurchasesOffering | null> {
  const result = await fetchOfferingForPaywall();
  return result.success ? result.offering : null;

export async function fetchCustomerInfo(): Promise<CustomerInfo | null> {
  const Purchases = tryPurchases();
  if (!Purchases) return null;
  try {
    return await Purchases.getCustomerInfo();
  } catch {
    return null;
  }
}

export function customerHasPremium(info: CustomerInfo | null): boolean {
  if (!info) return false;
  const active = info.entitlements.active;
  return PREMIUM_ENTITLEMENT_KEYS.some((key) => Boolean(active[key]));
}

export async function restorePurchases(): Promise<CustomerInfo | null> {
  const Purchases = tryPurchases();
  if (!Purchases) return null;
  try {
    return await Purchases.restorePurchases();
  } catch {
    return null;
  }
}

/**
 * Binds RevenueCat to the Supabase user id so App Store, Play, and Web Billing
 * share one customer record (required for single subscription across platforms).
 */
export async function identifyRevenueCatUser(appUserId: string | null): Promise<void> {
  const Purchases = tryPurchases();
  if (!Purchases) return;
  const ready = await initRevenueCat();
  if (!ready) return;
  try {
    if (!appUserId?.trim()) {
      if (!lastIdentifiedAppUserId) return;
      await Purchases.logOut();
      lastIdentifiedAppUserId = null;
      return;
    }
    const id = appUserId.trim();
    await Purchases.logIn(id);
    lastIdentifiedAppUserId = id;
  } catch (e) {
    if (__DEV__) console.warn('[RevenueCat] identify user failed', e);
  }
}

export { ENTITLEMENT_PREMIUM };
