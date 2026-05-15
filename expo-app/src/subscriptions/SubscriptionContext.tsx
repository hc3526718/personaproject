import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from '../auth/AuthContext';
import { isPremiumDemoEmail } from '../auth/demoAccounts';
import {
  customerHasPremium,
  fetchCustomerInfo,
  initRevenueCat,
  restorePurchases,
} from './revenueCat';
import { getSupabase } from '../lib/supabase';
import { syncDaltonVerifiedFromProfileIfPremium } from '../auth/userMetadataSupabase';
import { PremiumSubscriptionThanksModal } from '../components/PremiumSubscriptionThanksModal';

type SubscriptionContextValue = {
  isPro: boolean;
  busy: boolean;
  refresh: () => Promise<void>;
  /** Resolves true when restore grants premium when it was not active before this call. */
  restore: () => Promise<boolean>;
  /** Show after RevenueCat paywall / restore grants premium for the first time this session detection. */
  notifyNewPremiumFromPaywall: (activated: boolean) => void;
};

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { sessionEmail } = useAuth();
  const [isPro, setIsPro] = useState(false);
  const [busy, setBusy] = useState(true);
  const [premiumThanksVisible, setPremiumThanksVisible] = useState(false);

  const notifyNewPremiumFromPaywall = useCallback((activated: boolean) => {
    if (activated) setPremiumThanksVisible(true);
  }, []);

  const dismissPremiumThanks = useCallback(() => {
    setPremiumThanksVisible(false);
  }, []);

  const refresh = useCallback(async () => {
    setBusy(true);
    if (!sessionEmail?.trim()) {
      setIsPro(false);
      setBusy(false);
      return;
    }
    if (isPremiumDemoEmail(sessionEmail)) {
      setIsPro(true);
      setBusy(false);
      const s = getSupabase();
      if (s) await syncDaltonVerifiedFromProfileIfPremium(s, true);
      return;
    }
    await initRevenueCat();
    const info = await fetchCustomerInfo();
    const pro = customerHasPremium(info);
    setIsPro(pro);
    if (pro) {
      const s = getSupabase();
      if (s) await syncDaltonVerifiedFromProfileIfPremium(s, true);
    }
    setBusy(false);
  }, [sessionEmail]);

  const restore = useCallback(async (): Promise<boolean> => {
    setBusy(true);
    if (!sessionEmail?.trim()) {
      setIsPro(false);
      setBusy(false);
      return false;
    }
    if (isPremiumDemoEmail(sessionEmail)) {
      setIsPro(true);
      setBusy(false);
      const s = getSupabase();
      if (s) await syncDaltonVerifiedFromProfileIfPremium(s, true);
      return false;
    }
    await initRevenueCat();
    const before = await fetchCustomerInfo();
    const hadPro = customerHasPremium(before);
    const info = await restorePurchases();
    const pro = customerHasPremium(info);
    const gained = pro && !hadPro;
    setIsPro(pro);
    if (pro) {
      const s = getSupabase();
      if (s) await syncDaltonVerifiedFromProfileIfPremium(s, true);
    }
    setBusy(false);
    return gained;
  }, [sessionEmail]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ isPro, busy, refresh, restore, notifyNewPremiumFromPaywall }),
    [isPro, busy, refresh, restore, notifyNewPremiumFromPaywall],
  );

  return (
    <>
      <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>
      <PremiumSubscriptionThanksModal visible={premiumThanksVisible} onDismiss={dismissPremiumThanks} />
    </>
  );
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription requires SubscriptionProvider');
  return ctx;
}
