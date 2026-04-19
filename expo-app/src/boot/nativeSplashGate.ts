import * as SplashScreen from 'expo-splash-screen';

let nativeSplashHidden = false;

/** Call once when boot visual (embed WebView, Rive, or bounce fallback) is ready to show — then native splash can hide without a flash. */
export function hideNativeSplashWhenBootVisualReady(): void {
  if (nativeSplashHidden) return;
  nativeSplashHidden = true;
  void SplashScreen.hideAsync();
}
