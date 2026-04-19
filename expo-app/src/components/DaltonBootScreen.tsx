import { DaltonBootScreenRive } from './DaltonBootScreenRive';

/**
 * Full-screen boot — Expo Go uses WebView **embed** only (no `rive-react-native`).
 * Native splash is dismissed when the boot visual is ready (`nativeSplashGate`).
 */
export function DaltonBootScreen() {
  return <DaltonBootScreenRive />;
}
