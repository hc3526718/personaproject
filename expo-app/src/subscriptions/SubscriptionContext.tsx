import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
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
  const [isPro, setIsPro] = useState(false);
  const [busy, setBusy] = useState(true);

  const refresh = useCallback(async () => {
    setBusy(true);
    await initRevenueCat();
    const info = await fetchCustomerInfo();
    setIsPro(customerHasPremium(info));
    setBusy(false);
  }, []);

  const restore = useCallback(async () => {
    setBusy(true);
    const info = await restorePurchases();
    setIsPro(customerHasPremium(info));
    setBusy(false);
  }, []);

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
