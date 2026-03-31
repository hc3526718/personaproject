import { Platform } from 'react-native';
import Constants from 'expo-constants';
import Purchases, { type CustomerInfo } from 'react-native-purchases';

const ENTITLEMENT_PREMIUM = 'premium';

function isExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

/**
 * Safe init for Expo Go (skipped) and dev/production builds with API keys.
 */
export async function initRevenueCat(): Promise<void> {
  if (isExpoGo()) return;
  const ios = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS?.trim();
  const android = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID?.trim();
  const key = Platform.OS === 'ios' ? ios : android;
  if (!key) return;
  try {
    Purchases.configure({ apiKey: key });
  } catch (e) {
    if (__DEV__) console.warn('[RevenueCat] configure failed', e);
  }
}

export async function fetchCustomerInfo(): Promise<CustomerInfo | null> {
  if (isExpoGo()) return null;
  try {
    return await Purchases.getCustomerInfo();
  } catch {
    return null;
  }
}

export function customerHasPremium(info: CustomerInfo | null): boolean {
  if (!info) return false;
  return Boolean(info.entitlements.active[ENTITLEMENT_PREMIUM]);
}

export async function restorePurchases(): Promise<CustomerInfo | null> {
  if (isExpoGo()) return null;
  try {
    return await Purchases.restorePurchases();
  } catch {
    return null;
  }
}

export { ENTITLEMENT_PREMIUM };
