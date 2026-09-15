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
      return;
    }
    await initRevenueCat();
    const info = await fetchCustomerInfo();
    setIsPro(customerHasPremium(info));
    setBusy(false);
  }, [sessionEmail]);

  const restore = useCallback(async () => {
    setBusy(true);
    if (isPremiumDemoEmail(sessionEmail)) {
      setIsPro(true);
      setBusy(false);
      return;
    }
    const info = await restorePurchases();
    setIsPro(customerHasPremium(info));
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
