import type { ComponentType, ReactNode } from 'react';
import { AccessibilityProvider } from '../accessibility/AccessibilityContext';
import { useAuth } from '../auth/AuthContext';
import { SubscriptionProvider } from '../subscriptions/SubscriptionContext';
import { DeferredAppProviders } from './DeferredAppProviders';

function SubscriptionWhenSignedIn({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <>{children}</>;
  return <SubscriptionProvider>{children}</SubscriptionProvider>;
}

type Props = {
  children: ReactNode;
  /** When false, only pass children through (auth/fonts still booting). */
  enabled: boolean;
};

/** Accessibility + banners + subscriptions — separate Metro chunk from auth boot. */
export function FullShellProviders({ children, enabled }: Props) {
  if (!enabled) return <>{children}</>;
  return (
    <AccessibilityProvider>
      <SubscriptionWhenSignedIn>
        <DeferredAppProviders enabled>{children}</DeferredAppProviders>
      </SubscriptionWhenSignedIn>
    </AccessibilityProvider>
  );
}

export type { ComponentType };
