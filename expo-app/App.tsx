import { useEffect, useRef, useState } from 'react';
import * as Sentry from '@sentry/react-native';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/auth/AuthContext';
import { ActionBannerProvider } from './src/actionBanner/ActionBannerContext';
import { DaltonBootScreen } from './src/components/DaltonBootScreen';
import { DaltonVerifiedWelcomeOverlay } from './src/components/DaltonVerifiedWelcomeOverlay';
import { AppNavigator } from './src/navigation/AppNavigator';
import { SubscriptionProvider } from './src/subscriptions/SubscriptionContext';
import { DS } from './src/designSystem';
import { BOOT_OVERLAY_FADE_MS, MIN_BOOT_OVERLAY_MS } from './src/constants/bootTiming';
import { appFontSources } from './src/loadAppFonts';
import WebDemoApp from './src/WebDemoApp';

/** Set EXPO_PUBLIC_USE_WEBVIEW_DEMO=1 to load static HTML in WebView instead of native screens. */
const USE_WEBVIEW_DEMO = process.env.EXPO_PUBLIC_USE_WEBVIEW_DEMO === '1';


function NativeShellInner({
  fontsReady,
  bootElapsed,
}: {
  fontsReady: boolean;
  bootElapsed: boolean;
}) {
  const { ready: authReady } = useAuth();
  const coreReady = fontsReady && authReady;
  const bootComplete = coreReady && bootElapsed; // `bootElapsed` uses MIN_BOOT_OVERLAY_MS
  const bootOpacity = useRef(new Animated.Value(1)).current;
  const [bootLayerGone, setBootLayerGone] = useState(false);

  useEffect(() => {
    if (!bootComplete || bootLayerGone) return;
    Animated.timing(bootOpacity, {
      toValue: 0,
      duration: BOOT_OVERLAY_FADE_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setBootLayerGone(true);
    });
  }, [bootComplete, bootLayerGone, bootOpacity]);

  return (
    <SubscriptionProvider>
      <ActionBannerProvider>
        <View style={styles.shell}>
          {coreReady ? <AppNavigator /> : null}
        {!bootLayerGone ? (
          <Animated.View
            style={[styles.bootOverlay, { opacity: bootOpacity }]}
            pointerEvents={bootComplete ? 'none' : 'auto'}
          >
            <DaltonBootScreen />
          </Animated.View>
        ) : null}
        <DaltonVerifiedWelcomeOverlay deferVisible={Boolean(coreReady && bootLayerGone)} />
        </View>
      </ActionBannerProvider>
    </SubscriptionProvider>
  );
}

function NativeShell() {
  const [fontsLoaded, fontError] = useFonts(appFontSources);
  const [bootElapsed, setBootElapsed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setBootElapsed(true), MIN_BOOT_OVERLAY_MS);
    return () => clearTimeout(t);
  }, []);

  if (fontError && __DEV__) {
    console.warn('[Dalton] Font load failed; using system fonts:', fontError.message);
  }

  const fontsReady = fontsLoaded || !!fontError;

  return (
    <AuthProvider>
      <NativeShellInner fontsReady={fontsReady} bootElapsed={bootElapsed} />
    </AuthProvider>
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

export default Sentry.wrap(App);

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: DS.color.background },
  shell: { flex: 1, backgroundColor: DS.color.background },
  bootOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: DS.color.background,
    zIndex: 10,
  },
});
