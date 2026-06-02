import 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import * as WebBrowser from 'expo-web-browser';
import { registerRootComponent } from 'expo';
import App from './App';

void SplashScreen.preventAutoHideAsync().catch(() => {
  /* Expo Go / simulator may reject if splash already hidden */
});
WebBrowser.maybeCompleteAuthSession();

registerRootComponent(App);

// After the root is registered — avoid loading Sentry native code during bundle evaluation.
void import('./src/monitoring/sentryBoot').then(({ initSentryFromEnv }) => {
  try {
    initSentryFromEnv();
  } catch {
    /* non-fatal */
  }
});
