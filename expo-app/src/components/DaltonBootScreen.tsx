import { DaltonBootScreenRive } from './DaltonBootScreenRive';

/**
 * Full-screen boot — Rive Cloud **embed** in Expo Go / default dev; native Rive when embed is disabled.
 * Native splash is dismissed when the boot visual is ready (`nativeSplashGate`).
 */
export function DaltonBootScreen() {
  return <DaltonBootScreenRive />;
}
