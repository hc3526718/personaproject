import { useEffect } from 'react';
import { wrapWithSentry } from './src/monitoring/sentryBoot';
import { StyleSheet, View } from 'react-native';
import { useFonts } from 'expo-font';
import { hideNativeSplash, scheduleNativeSplashFailsafe } from './src/boot/nativeSplashGate';
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
import { BootCircleLoader } from './src/components/BootCircleLoader';
import { BrandLogo } from './src/components/BrandLogo';
import { DALTON_BOOT_VIDEO_BG, warmDaltonBootVideoCache } from './src/constants/daltonBootVideo';
import { appFontSources } from './src/loadAppFonts';
import { AppAlertProvider } from './src/components/AppAlertProvider';
import { installNativeAlertBridge } from './src/lib/appAlert';
import { MediaSourcePickerHost } from './src/components/MediaSourcePickerHost';
import { KeyboardDismissShell } from './src/components/KeyboardDismissShell';
import WebDemoApp from './src/WebDemoApp';

/** Set EXPO_PUBLIC_USE_WEBVIEW_DEMO=1 to load static HTML in WebView instead of native screens. */
const USE_WEBVIEW_DEMO = process.env.EXPO_PUBLIC_USE_WEBVIEW_DEMO === '1';

installNativeAlertBridge();

function NativeShellInner({ fontsReady }: { fontsReady: boolean }) {
  const { ready: authReady } = useAuth();
  const coreReady = fontsReady && authReady;

  useEffect(() => {
    scheduleNativeSplashFailsafe();
    void configurePushPresentation();
    warmDaltonBootVideoCache();
  }, []);

  useEffect(() => {
    if (fontsReady) hideNativeSplash();
  }, [fontsReady]);

  useEffect(() => {
    if (coreReady) hideNativeSplash();
  }, [coreReady]);

  return (
    <AccessibilityProvider>
      <SubscriptionProvider>
        <ActionBannerProvider>
          <ActivityBadgeProvider>
          <KeyboardDismissShell>
          <View style={styles.shell}>
            {coreReady ? (
              <>
                <AppNavigator />
                <ConversationInAppAlerts />
                <EventInAppAlerts />
                <NotificationPushRelay />
                <MediaSourcePickerHost />
              </>
            ) : (
              <View style={styles.bootLoader}>
                <BrandLogo width={160} height={160} />
                <View style={styles.bootLoaderRing}>
                  <BootCircleLoader size={64} compact />
                </View>
              </View>
            )}
          </View>
          </KeyboardDismissShell>
          </ActivityBadgeProvider>
        </ActionBannerProvider>
      </SubscriptionProvider>
    </AccessibilityProvider>
  );
}

function NativeShell() {
  const [fontsLoaded, fontError] = useFonts(appFontSources);

  if (fontError && __DEV__) {
    console.warn('[Dalton] Font load failed; using system fonts:', fontError.message);
  }

  const fontsReady = fontsLoaded || !!fontError;

  return (
    <AppAlertProvider>
      <AuthProvider>
        <NativeShellInner fontsReady={fontsReady} />
      </AuthProvider>
    </AppAlertProvider>
  );
}

function App() {
  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        {USE_WEBVIEW_DEMO ? <WebDemoApp /> : <NativeShell />}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default wrapWithSentry(App);

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: DS.color.background },
  shell: { flex: 1, backgroundColor: DS.color.background },
  bootLoader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DALTON_BOOT_VIDEO_BG,
  },
  bootLoaderRing: {
    marginTop: DS.space.lg,
  },
});
