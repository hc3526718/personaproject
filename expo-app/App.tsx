import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFonts } from 'expo-font';
import { runAfterFirstFrame } from './src/boot/deferNativeSideEffects';
import { hideNativeSplash, scheduleNativeSplashFailsafe } from './src/boot/nativeSplashGate';
import { AppErrorBoundary } from './src/components/AppErrorBoundary';
import { BootSafeLoader } from './src/components/BootSafeLoader';
import { configurePushPresentation } from './src/lib/pushRegistration';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/auth/AuthContext';
import { AccessibilityProvider } from './src/accessibility/AccessibilityContext';
import { ActionBannerProvider } from './src/actionBanner/ActionBannerContext';
import { ActivityBadgeProvider } from './src/activity/ActivityBadgeProvider';
import { ConversationInAppAlerts } from './src/activity/ConversationInAppAlerts';
import { EventInAppAlerts } from './src/activity/EventInAppAlerts';
import { NotificationPushRelay } from './src/activity/NotificationPushRelay';
import { AppNavigator } from './src/navigation/AppNavigator';
import { SubscriptionProvider } from './src/subscriptions/SubscriptionContext';
import { DS } from './src/designSystem';
import { DALTON_BOOT_VIDEO_BG } from './src/constants/daltonBootVideo';
import { appFontSources } from './src/loadAppFonts';
import WebDemoApp from './src/WebDemoApp';

/** Set EXPO_PUBLIC_USE_WEBVIEW_DEMO=1 to load static HTML in WebView instead of native screens. */
const USE_WEBVIEW_DEMO = process.env.EXPO_PUBLIC_USE_WEBVIEW_DEMO === '1';

/** Set EXPO_PUBLIC_MINIMAL_BOOT=1 to verify the binary boots (isolates native vs app JS). */
const MINIMAL_BOOT = process.env.EXPO_PUBLIC_MINIMAL_BOOT === '1';

function NativeShellInner({ fontsReady }: { fontsReady: boolean }) {
  const { ready: authReady } = useAuth();
  const coreReady = fontsReady && authReady;
  const [navEpoch, setNavEpoch] = useState(0);
  const remountNavigator = useCallback(() => setNavEpoch((n) => n + 1), []);

  useEffect(() => {
    scheduleNativeSplashFailsafe();
  }, []);

  useEffect(() => {
    if (!fontsReady) return;
    hideNativeSplash();
  }, [fontsReady]);

  useEffect(() => {
    if (!coreReady) return;
    hideNativeSplash();
    runAfterFirstFrame(() => {
      void configurePushPresentation();
    });
  }, [coreReady]);

  return (
    <AppErrorBoundary onRetry={remountNavigator}>
      <AccessibilityProvider>
        <SubscriptionProvider>
          <ActionBannerProvider>
            <ActivityBadgeProvider>
              <View style={styles.shell}>
                {coreReady ? (
                  <>
                    <AppNavigator key={navEpoch} />
                    <ConversationInAppAlerts />
                    <EventInAppAlerts />
                    <NotificationPushRelay />
                  </>
                ) : (
                  <View style={styles.bootLoader}>
                    <BootSafeLoader compact />
                  </View>
                )}
              </View>
            </ActivityBadgeProvider>
          </ActionBannerProvider>
        </SubscriptionProvider>
      </AccessibilityProvider>
    </AppErrorBoundary>
  );
}

function NativeShell() {
  const [fontsLoaded, fontError] = useFonts(appFontSources);

  if (fontError && __DEV__) {
    console.warn('[Dalton] Font load failed; using system fonts:', fontError.message);
  }

  const fontsReady = fontsLoaded || !!fontError;

  return (
    <AuthProvider>
      <NativeShellInner fontsReady={fontsReady} />
    </AuthProvider>
  );
}

function MinimalBootScreen() {
  useEffect(() => {
    hideNativeSplash();
  }, []);
  return (
    <View style={[styles.flex, styles.minimalBoot]}>
      <Text style={styles.minimalBootText}>Dalton boot OK</Text>
    </View>
  );
}

function App() {
  if (MINIMAL_BOOT) {
    return <MinimalBootScreen />;
  }

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        {USE_WEBVIEW_DEMO ? <WebDemoApp /> : <NativeShell />}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: DS.color.background },
  shell: { flex: 1, backgroundColor: DS.color.background },
  bootLoader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DALTON_BOOT_VIDEO_BG,
  },
  minimalBoot: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DS.color.background,
  },
  minimalBootText: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 18,
    color: DS.color.gold,
  },
});
