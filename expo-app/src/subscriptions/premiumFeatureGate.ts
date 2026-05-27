import { Alert } from 'react-native';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import type { AppUser } from '../auth/AuthContext';
import { hasPremiumOrAdminTier } from './navigateToPremiumPaywall';
import { presentPremiumPaywall } from './presentPremiumPaywall';

export const AWAITING_DALTON_VERIFICATION_TITLE = 'Awaiting Dalton verification';
export const AWAITING_DALTON_VERIFICATION_MESSAGE =
  'Once your account has been verified you will have access to your premium features.';

export type PremiumGateResult = 'allowed' | 'blocked';

/**
 * Gate creator/premium tools: paywall first (`is_pro`), then Dalton verification.
 * Verified without premium still hits the paywall; premium alone does not auto-verify (master approval).
 */
export async function gatePremiumFeatureAccess(opts: {
  navigation: NavigationProp<ParamListBase>;
  isPro: boolean;
  user: AppUser | null;
  refreshSubscription: () => Promise<void>;
  notifyNewPremiumFromPaywall?: (activated: boolean) => void;
}): Promise<PremiumGateResult> {
  const { navigation, isPro, user, refreshSubscription, notifyNewPremiumFromPaywall } = opts;

  const tierOk = hasPremiumOrAdminTier(isPro, user?.role) || Boolean(user?.masterControl);
  if (!tierOk) {
    const { premiumActivated } = await presentPremiumPaywall(navigation);
    await refreshSubscription();
    if (premiumActivated) notifyNewPremiumFromPaywall?.(true);
    return 'blocked';
  }

  const admin = user?.role === 'admin' || user?.role === 'super_admin';
  if (!user?.daltonVerified && !admin && !user?.masterControl) {
    Alert.alert(AWAITING_DALTON_VERIFICATION_TITLE, AWAITING_DALTON_VERIFICATION_MESSAGE);
    return 'blocked';
  }

  return 'allowed';
}
