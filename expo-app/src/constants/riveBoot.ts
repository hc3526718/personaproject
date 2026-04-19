import Constants, { ExecutionEnvironment } from 'expo-constants';
import { DS } from '../designSystem';

/**
 * Boot Rive — **native only** (`rive-react-native`): bundled asset or hosted `.riv` via `EXPO_PUBLIC_RIVE_URL`.
 * Expo Go has no native Rive module → boot UI uses the bounce fallback (see `DaltonBootRiveDisplay`).
 *
 * Optional: `EXPO_PUBLIC_RIVE_ARTBOARD`, `EXPO_PUBLIC_RIVE_STATE_MACHINE`, `EXPO_PUBLIC_RIVE_ANIMATION`
 * `EXPO_PUBLIC_BOOT_USE_RIVE=0` → bouncing PNG only.
 */
export const DALTON_BOOT_RIVE = require('../../assets/dalton_animated_logo.riv');

/** Page background (native splash + boot shell). */
export const BOOT_PAGE_BACKGROUND = DS.color.background;

function envTrim(name: string): string | undefined {
  const v = process.env[name];
  const t = typeof v === 'string' ? v.trim() : '';
  return t.length ? t : undefined;
}

export const DALTON_BOOT_ARTBOARD = envTrim('EXPO_PUBLIC_RIVE_ARTBOARD');
export const DALTON_BOOT_STATE_MACHINE = envTrim('EXPO_PUBLIC_RIVE_STATE_MACHINE');
export const DALTON_BOOT_ANIMATION = envTrim('EXPO_PUBLIC_RIVE_ANIMATION');

/** Direct `.riv` HTTPS URL for **native** Rive. */
export const DALTON_BOOT_RIVE_URL = envTrim('EXPO_PUBLIC_RIVE_URL');

/** `EXPO_PUBLIC_BOOT_USE_RIVE=0` → use bouncing PNG instead of Rive. */
export const BOOT_USE_RIVE = process.env.EXPO_PUBLIC_BOOT_USE_RIVE !== '0';

export function daltonRiveLayoutProps() {
  return {
    ...(DALTON_BOOT_ARTBOARD ? { artboardName: DALTON_BOOT_ARTBOARD } : {}),
    ...(DALTON_BOOT_STATE_MACHINE ? { stateMachineName: DALTON_BOOT_STATE_MACHINE } : {}),
    ...(DALTON_BOOT_ANIMATION ? { animationName: DALTON_BOOT_ANIMATION } : {}),
  };
}

export type DaltonBootRiveDisplayMode = 'native-url' | 'bundled';

/**
 * **native-url** — hosted `.riv` for `rive-react-native`.
 * **bundled** — local `require` asset (default when no hosted `.riv` URL).
 */
export function getDaltonBootRiveDisplayMode(): DaltonBootRiveDisplayMode {
  if (!BOOT_USE_RIVE) return 'bundled';
  const expoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  if (expoGo) {
    return 'bundled';
  }
  const riv = DALTON_BOOT_RIVE_URL;
  if (riv && /^https:\/\//i.test(riv) && /\.riv($|\?)/i.test(riv)) {
    return 'native-url';
  }
  return 'bundled';
}

/**
 * `rive-react-native` expects XOR: `url` **or** `source` (not both).
 */
export function getDaltonBootRiveAsset(): { url: string } | { source: number } {
  const u = DALTON_BOOT_RIVE_URL;
  if (u && /^https:\/\//i.test(u) && /\.riv($|\?)/i.test(u)) {
    return { url: u };
  }
  return { source: DALTON_BOOT_RIVE };
}
