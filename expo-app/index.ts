import 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import * as WebBrowser from 'expo-web-browser';
import { registerRootComponent } from 'expo';
import App from './App';

void SplashScreen.preventAutoHideAsync();
WebBrowser.maybeCompleteAuthSession();

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
