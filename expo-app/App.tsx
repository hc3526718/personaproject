import { useEffect, useState, type ReactNode } from 'react';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/auth/AuthContext';
import { BrandedBootScreen } from './src/components/BrandedBootScreen';
import { AppNavigator } from './src/navigation/AppNavigator';
import { SubscriptionProvider } from './src/subscriptions/SubscriptionContext';
import { DS } from './src/designSystem';
import { appFontSources } from './src/loadAppFonts';
import WebDemoApp from './src/WebDemoApp';

/** Set EXPO_PUBLIC_USE_WEBVIEW_DEMO=1 to load static HTML in WebView instead of native screens. */
const USE_WEBVIEW_DEMO = process.env.EXPO_PUBLIC_USE_WEBVIEW_DEMO === '1';

/** Minimum time the branded loading UI is shown (demo showcase). */
const MIN_BOOT_MS = 2800;

function AuthReady({ children }: { children: ReactNode }) {
  const { ready } = useAuth();
  if (!ready) {
    return <BrandedBootScreen />;
  }
  return <>{children}</>;
}

function NativeShell() {
  const [fontsLoaded, fontError] = useFonts(appFontSources);
  const [bootElapsed, setBootElapsed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setBootElapsed(true), MIN_BOOT_MS);
    return () => clearTimeout(t);
  }, []);

  if (fontError && __DEV__) {
    console.warn('[Dalton] Font load failed; using system fonts:', fontError.message);
  }

  const fontsReady = fontsLoaded || !!fontError;
  const showBoot = !fontsReady || !bootElapsed;

  if (showBoot) {
    return <BrandedBootScreen />;
  }

  return (
    <AuthProvider>
      <AuthReady>
        <SubscriptionProvider>
          <AppNavigator />
        </SubscriptionProvider>
      </AuthReady>
    </AuthProvider>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        {USE_WEBVIEW_DEMO ? <WebDemoApp /> : <NativeShell />}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: DS.color.background },
});
