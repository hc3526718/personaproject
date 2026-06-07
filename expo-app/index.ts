import 'react-native-gesture-handler';
import { installWebPolyfills } from './src/lib/installWebPolyfills';

installWebPolyfills();
import * as SplashScreen from 'expo-splash-screen';
import * as WebBrowser from 'expo-web-browser';
import { registerRootComponent } from 'expo';
import RootGate from './RootGate';

void SplashScreen.preventAutoHideAsync().catch(() => {
  /* Expo Go / simulator may reject if splash already hidden */
});
WebBrowser.maybeCompleteAuthSession();

registerRootComponent(RootGate);