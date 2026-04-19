import { DaltonBootScreenRive } from './DaltonBootScreenRive';

/**
 * Full-screen boot — native Rive when available; Expo Go uses bounce (no `rive-react-native`).
 * Native splash is dismissed when the boot visual is ready (`nativeSplashGate`).
 */
export function DaltonBootScreen() {
  return <DaltonBootScreenRive />;
}
