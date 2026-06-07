import { useCallback, useEffect, useState, type ComponentType, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AuthProvider, useAuth } from '../auth/AuthContext';
import { bootTrace } from './bootTrace';
import { BootErrorBoundary } from './BootErrorBoundary';
import { BootSafeLoader } from '../components/BootSafeLoader';
import { runAfterFirstFrame } from './deferNativeSideEffects';
import { hideNativeSplash, scheduleNativeSplashFailsafe } from './nativeSplashGate';
import { DS } from '../designSystem';
import { DALTON_BOOT_VIDEO_BG } from '../constants/daltonBootVideo';

const BOOT_PROBE = process.env.EXPO_PUBLIC_BOOT_PROBE === '1';

function BootProbe({ label }: { label: string }) {
  if (!BOOT_PROBE) return null;
  return (
    <View style={styles.probe} pointerEvents="none">
      <Text style={styles.probeText}>{label}</Text>
    </View>
  );
}

function LazyAppNavigator({ navEpoch }: { navEpoch: number }) {
  const [Navigator, setNavigator] = useState<ComponentType<{ key?: number }> | null>(null);
  const [alerts, setAlerts] = useState<{
    Conversation: ComponentType | null;
    Event: ComponentType | null;
    PushRelay: ComponentType | null;
  }>({ Conversation: null, Event: null, PushRelay: null });
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    bootTrace('LazyAppNavigator: require navigation');
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const navMod = require('../navigation/AppNavigator') as {
        AppNavigator: ComponentType<{ key?: number }>;
      };
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const convMod = require('../activity/ConversationInAppAlerts') as {
        ConversationInAppAlerts: ComponentType;
      };
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const evtMod = require('../activity/EventInAppAlerts') as { EventInAppAlerts: ComponentType };
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pushMod = require('../activity/NotificationPushRelay') as {
        NotificationPushRelay: ComponentType;
      };
      if (cancelled) return;
      bootTrace('LazyAppNavigator: ok');
      setNavigator(() => navMod.AppNavigator);
      setAlerts({
        Conversation: convMod.ConversationInAppAlerts,
        Event: evtMod.EventInAppAlerts,
        PushRelay: pushMod.NotificationPushRelay,
      });
    } catch (e) {
      if (!cancelled) {
        const msg = e instanceof Error ? e.message : 'Navigation failed';
        bootTrace(`LazyAppNavigator: ERROR ${msg}`);
        setLoadError(msg);
      }
    }
    return () => {
      cancelled = true;
    };
  }, []);

  if (loadError) {
    return (
      <View style={styles.bootLoader}>
        <Text style={styles.errorTitle}>Navigation load failed</Text>
        <Text style={styles.errorBody}>{loadError}</Text>
      </View>
    );
  }

  if (!Navigator) {
    return (
      <View style={styles.bootLoader}>
        <BootProbe label="Loading navigation…" />
        <BootSafeLoader compact />
      </View>
    );
  }

  const ConversationInAppAlerts = alerts.Conversation;
  const EventInAppAlerts = alerts.Event;
  const NotificationPushRelay = alerts.PushRelay;

  return (
    <>
      <Navigator key={navEpoch} />
      {ConversationInAppAlerts ? <ConversationInAppAlerts /> : null}
      {EventInAppAlerts ? <EventInAppAlerts /> : null}
      {NotificationPushRelay ? <NotificationPushRelay /> : null}
    </>
  );
}

function AuthShellInner() {
  const { ready: authReady } = useAuth();
  const coreReady = authReady;
  const [navEpoch, setNavEpoch] = useState(0);
  const [Providers, setProviders] = useState<ComponentType<{
    children: ReactNode;
    enabled: boolean;
  }> | null>(null);
  const remountNavigator = useCallback(() => setNavEpoch((n) => n + 1), []);

  useEffect(() => {
    scheduleNativeSplashFailsafe();
  }, []);

  useEffect(() => {
    if (!authReady) return;
    bootTrace('AuthBootShell: auth ready');
  }, [authReady]);

  useEffect(() => {
    if (!coreReady) return;
    bootTrace('AuthBootShell: require FullShellProviders');
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const m = require('./FullShellProviders') as {
        FullShellProviders: ComponentType<{ children: ReactNode; enabled: boolean }>;
      };
      bootTrace('AuthBootShell: FullShellProviders ok');
      setProviders(() => m.FullShellProviders);
    } catch (e) {
      bootTrace(
        `AuthBootShell: FullShellProviders FAIL ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }, [coreReady]);

  useEffect(() => {
    if (!coreReady) return;
    hideNativeSplash();
    runAfterFirstFrame(() => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { configurePushPresentation } = require('../lib/pushRegistration') as {
          configurePushPresentation: () => Promise<void>;
        };
        void configurePushPresentation();
      } catch {
        /* non-fatal */
      }
    });
  }, [coreReady]);

  const body = (
    <View style={styles.shell}>
              {!authReady ? (
        <View style={styles.bootLoader}>
          <BootProbe label="Starting auth…" />
          <BootSafeLoader compact />
        </View>
      ) : (
        <>
          <BootProbe label="Loading app…" />
          <LazyAppNavigator navEpoch={navEpoch} />
        </>
      )}
    </View>
  );

  if (!Providers) return body;

  const FullShellProviders = Providers;
  return <FullShellProviders enabled={coreReady}>{body}</FullShellProviders>;
}

function NativeShell() {
  return (
    <AuthProvider>
      <AuthShellInner />
    </AuthProvider>
  );
}

export function AuthBootShell() {
  useEffect(() => {
    bootTrace('AuthBootShell: mounted');
  }, []);

  return (
    <BootErrorBoundary>
      <NativeShell />
    </BootErrorBoundary>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: DS.color.background },
  bootLoader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DALTON_BOOT_VIDEO_BG,
    paddingHorizontal: DS.space.xl,
    gap: DS.space.sm,
  },
  probe: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  probeText: {
    fontSize: 12,
    color: DS.color.gold,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
  },
  errorTitle: {
    fontSize: 16,
    color: DS.color.white,
    textAlign: 'center',
    fontWeight: '600',
  },
  errorBody: {
    fontSize: 13,
    color: DS.color.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
