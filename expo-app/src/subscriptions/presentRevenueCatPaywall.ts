import { Alert } from 'react-native';
import type RevenueCatUIDefault from 'react-native-purchases-ui';
import {
  customerHasPremium,
  fetchCustomerInfo,
  fetchOfferingForPaywall,
  initRevenueCat,
  type FetchOfferingResult,
} from './revenueCat';
import { userFacingErrorBody } from '../lib/appAlert';

/** `react-native-purchases-ui` exports `RevenueCatUI` as default — CommonJS `require` is `{ default }`, not `{ RevenueCatUI }`. */
function getRevenueCatUI(): typeof RevenueCatUIDefault | null {
  try {
    const ui = require('react-native-purchases-ui') as {
      default?: typeof RevenueCatUIDefault;
      RevenueCatUI?: typeof RevenueCatUIDefault;
    };
    return ui.default ?? ui.RevenueCatUI ?? null;
  } catch {
    return null;
  }
}

export type PresentPaywallResult = {
  /** User dismissed paywall without error (native sheet may still cancel purchase). */
  presentedOk: boolean;
  /** Premium entitlement became active after the sheet closed (purchase or restore from sheet). */
  premiumActivated: boolean;
  /** Offering fetch failed - can retry */
  offeringError?: 'not_configured' | 'network_error' | 'no_offerings' | 'unknown';
};

/**
 * Presents RevenueCat Paywall UI from the **react-native-purchases-ui** package (already in package.json).
 *
 * - **Offering**: Passes the offering from `fetchOfferingForPaywall()` so prices match **App Store**
 *   products (not the dashboard **current** offering if that still points at Test Store). Override with
 *   `EXPO_PUBLIC_REVENUECAT_OFFERING_IDENTIFIER` (lookup key).
 * - **Expo Go**: Native Purchases are unavailable; calls may error and show an alert (use a dev build to test).
 */
function getUserFriendlyErrorMessage(offeringResult: FetchOfferingResult): { title: string; message: string } {
  if (offeringResult.success) {
    throw new Error('getUserFriendlyErrorMessage called with success result');
  }

  switch (offeringResult.error) {
    case 'not_configured':
      if (__DEV__) {
        return {
          title: 'Premium Subscriptions',
          message: 'RevenueCat is not configured. Set EXPO_PUBLIC_REVENUECAT_API_KEY_IOS (or _ANDROID) in .env, restart Metro, and for EAS builds add the same variable to the production environment and rebuild.',
        };
      }
      return {
        title: 'Premium Subscriptions',
        message: 'Subscriptions are temporarily unavailable. Please try again later or contact support if this persists.',
      };

    case 'network_error':
      return {
        title: 'Connection Error',
        message: 'Unable to connect to the subscription service. Please check your internet connection and try again.',
      };

    case 'no_offerings':
      if (__DEV__) {
        return {
          title: 'Configuration Issue',
          message: 'No subscription products are configured. This usually means:\n\n• App Store Connect products are not approved or attached to this app version\n• Product IDs in RevenueCat dashboard don\'t match App Store Connect\n• The offering is not published in RevenueCat dashboard\n\nCheck the RevenueCat dashboard and App Store Connect.',
        };
      }
      return {
        title: 'Subscriptions Unavailable',
        message: 'Subscription options are being set up and will be available soon. Please try again later or contact support if you need immediate assistance.',
      };

    case 'unknown':
    default:
      return {
        title: 'Premium Subscriptions',
        message: __DEV__ && offeringResult.errorMessage
          ? `Failed to load subscription options: ${offeringResult.errorMessage}`
          : 'Unable to load subscription options. Please try again later.',
      };
  }
}

function notConfiguredMessage(): string {
  if (__DEV__) {
    return 'RevenueCat is not configured. Set EXPO_PUBLIC_REVENUECAT_API_KEY_IOS (or _ANDROID) in .env, restart Metro, and for EAS builds add the same variable to the production environment and rebuild.';
  }
  return 'Subscriptions are temporarily unavailable. Please try again later.';
}

export async function presentRevenueCatPaywall(): Promise<PresentPaywallResult> {
  const configured = await initRevenueCat();
  if (!configured) {
    Alert.alert('Premium', notConfiguredMessage());
    return { presentedOk: false, premiumActivated: false, offeringError: 'not_configured' };
  }

  const before = await fetchCustomerInfo();
  const hadPremium = customerHasPremium(before);

  // Fetch offering with detailed error information
  const offeringResult = await fetchOfferingForPaywall();

  if (!offeringResult.success) {
    const { title, message } = getUserFriendlyErrorMessage(offeringResult);
    
    // Show error with retry option for network errors
    if (offeringResult.error === 'network_error') {
      return new Promise((resolve) => {
        Alert.alert(
          title,
          message,
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => resolve({ 
                presentedOk: false, 
                premiumActivated: false, 
                offeringError: offeringResult.error 
              }),
            },
            {
              text: 'Retry',
              onPress: async () => {
                const retryResult = await presentRevenueCatPaywall();
                resolve(retryResult);
              },
            },
          ],
          { cancelable: false }
        );
      });
    }

    // For configuration errors, just show the message
    Alert.alert(title, message);
    return { 
      presentedOk: false, 
      premiumActivated: false, 
      offeringError: offeringResult.error 
    };
  }

  try {
    const rc = getRevenueCatUI();
    if (!rc?.presentPaywall) {
      throw new Error(
        'RevenueCat paywall UI is unavailable. If you are using Expo Go, create an EAS dev build (expo-dev-client) or a production build. Also ensure react-native-purchases-ui is installed and the app is rebuilt.',
      );
    }
    await rc.presentPaywall({ offering: offeringResult.offering });
  } catch (e) {
    const msg =
      __DEV__ && e instanceof Error
        ? e.message
        : userFacingErrorBody('open subscriptions');
    Alert.alert('Premium', msg);
    return { presentedOk: false, premiumActivated: false, offeringError: 'unknown' };
  }

  const after = await fetchCustomerInfo();
  const premiumActivated = customerHasPremium(after) && !hadPremium;
  return { presentedOk: true, premiumActivated };
}

export async function presentRevenueCatCustomerCenter(): Promise<boolean> {
  const configured = await initRevenueCat();
  if (!configured) {
    Alert.alert('Subscriptions', notConfiguredMessage());
    return false;
  }
  try {
    const rc = getRevenueCatUI();
    if (!rc?.presentCustomerCenter) {
      throw new Error(
        'RevenueCat customer center UI is unavailable. If you are using Expo Go, create an EAS dev build (expo-dev-client) or a production build. Also ensure react-native-purchases-ui is installed and the app is rebuilt.',
      );
    }
    await rc.presentCustomerCenter();
    return true;
  } catch (e) {
    const msg =
      __DEV__ && e instanceof Error
        ? e.message
        : userFacingErrorBody('manage your subscription');
    Alert.alert('Subscriptions', msg);
    return false;
  }
}
