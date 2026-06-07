import { useEffect, useState, type ComponentType, type ReactNode } from 'react';
import { bootTrace } from './bootTrace';

type ProviderPair = {
  ActionBanner: ComponentType<{ children: ReactNode }>;
  ActivityBadge: ComponentType<{ children: ReactNode }>;
};

/**
 * Action banner + activity badges pull in notification prefs — defer until after auth/fonts
 * so cold boot does not evaluate that graph during the first shell paint.
 */
export function DeferredAppProviders({ children, enabled }: { children: ReactNode; enabled: boolean }) {
  const [providers, setProviders] = useState<ProviderPair | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    bootTrace('DeferredAppProviders: require begin');
    try {
      // Sync require in useEffect — avoids Metro async `importAll` on production.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const banner = require('../actionBanner/ActionBannerContext') as {
        ActionBannerProvider: ComponentType<{ children: ReactNode }>;
      };
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const badges = require('../activity/ActivityBadgeProvider') as {
        ActivityBadgeProvider: ComponentType<{ children: ReactNode }>;
      };
      if (cancelled) return;
      bootTrace('DeferredAppProviders: require done');
      setProviders({
        ActionBanner: banner.ActionBannerProvider,
        ActivityBadge: badges.ActivityBadgeProvider,
      });
    } catch (e) {
      if (!cancelled) {
        const msg = e instanceof Error ? e.message : 'Provider load failed';
        bootTrace(`DeferredAppProviders: ERROR ${msg}`);
        setLoadError(msg);
      }
    }
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  if (!enabled) return <>{children}</>;

  if (loadError) return <>{children}</>;

  if (!providers) return <>{children}</>;

  const { ActionBanner, ActivityBadge } = providers;
  return (
    <ActionBanner>
      <ActivityBadge>{children}</ActivityBadge>
    </ActionBanner>
  );
}
