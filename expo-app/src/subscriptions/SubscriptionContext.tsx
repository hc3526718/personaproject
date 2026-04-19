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

type SubscriptionContextValue = {
  isPro: boolean;
  busy: boolean;
  refresh: () => Promise<void>;
  restore: () => Promise<void>;
};

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { sessionEmail } = useAuth();
  const [isPro, setIsPro] = useState(false);
  const [busy, setBusy] = useState(true);

  const refresh = useCallback(async () => {
    setBusy(true);
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

  const restore = useCallback(async () => {
    setBusy(true);
    if (isPremiumDemoEmail(sessionEmail)) {
      setIsPro(true);
      setBusy(false);
      const s = getSupabase();
      if (s) await syncDaltonVerifiedFromProfileIfPremium(s, true);
      return;
    }
    const info = await restorePurchases();
    const pro = customerHasPremium(info);
    setIsPro(pro);
    if (pro) {
      const s = getSupabase();
      if (s) await syncDaltonVerifiedFromProfileIfPremium(s, true);
    }
    setBusy(false);
  }, [sessionEmail]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ isPro, busy, refresh, restore }),
    [isPro, busy, refresh, restore],
  );

  return (
    <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription requires SubscriptionProvider');
  return ctx;
}
