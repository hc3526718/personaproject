import Constants, { ExecutionEnvironment } from 'expo-constants';
import { DS } from '../designSystem';

/**
 * Boot Rive:
 * - **embed** (default): Rive Cloud WebView — works in Expo Go; uses `EXPO_PUBLIC_RIVE_EMBED_URL` or default share URL.
 * - **native-url**: `EXPO_PUBLIC_RIVE_URL` hosted `.riv` via `rive-react-native`.
 * - **bundled**: local `.riv` when `EXPO_PUBLIC_RIVE_DISABLE_EMBED=1` on dev/EAS (Expo Go → bounce if no embed).
 */
export const DALTON_BOOT_RIVE = require('../../assets/dalton_animated_logo.riv');

export const DALTON_RIVE_EMBED_DEFAULT =
  'https://rive.app/s/2b5r5odTC0qRPicJRWg9Kw/embed?runtime=rive-renderer';

export const BOOT_PAGE_BACKGROUND = DS.color.background;

function readEmbedScale(): number {
  const raw = process.env.EXPO_PUBLIC_RIVE_EMBED_SCALE;
  const t = typeof raw === 'string' ? raw.trim() : '';
  if (t.length) {
    const n = Number(t);
    if (Number.isFinite(n) && n >= 1.25 && n <= 5.5) return n;
  }
  return 3.5;
}

export const BOOT_RIVE_EMBED_LOGO_SCALE = readEmbedScale();

function envTrim(name: string): string | undefined {
  const v = process.env[name];
  const t = typeof v === 'string' ? v.trim() : '';
  return t.length ? t : undefined;
}

export const DALTON_BOOT_ARTBOARD = envTrim('EXPO_PUBLIC_RIVE_ARTBOARD');
export const DALTON_BOOT_STATE_MACHINE = envTrim('EXPO_PUBLIC_RIVE_STATE_MACHINE');
export const DALTON_BOOT_ANIMATION = envTrim('EXPO_PUBLIC_RIVE_ANIMATION');
export const DALTON_BOOT_RIVE_URL = envTrim('EXPO_PUBLIC_RIVE_URL');
export const DALTON_BOOT_RIVE_EMBED_URL = envTrim('EXPO_PUBLIC_RIVE_EMBED_URL');

export const BOOT_USE_RIVE = process.env.EXPO_PUBLIC_BOOT_USE_RIVE !== '0';
export const RIVE_EMBED_DISABLED = process.env.EXPO_PUBLIC_RIVE_DISABLE_EMBED === '1';

export function daltonRiveLayoutProps() {
  return {
    ...(DALTON_BOOT_ARTBOARD ? { artboardName: DALTON_BOOT_ARTBOARD } : {}),
    ...(DALTON_BOOT_STATE_MACHINE ? { stateMachineName: DALTON_BOOT_STATE_MACHINE } : {}),
    ...(DALTON_BOOT_ANIMATION ? { animationName: DALTON_BOOT_ANIMATION } : {}),
  };
}

export function getDaltonBootRiveEmbedUri(): string {
  const fromEnv = DALTON_BOOT_RIVE_EMBED_URL;
  if (fromEnv && /^https:\/\//i.test(fromEnv)) return fromEnv;
  return DALTON_RIVE_EMBED_DEFAULT;
}

export type DaltonBootRiveDisplayMode = 'native-url' | 'embed' | 'bundled';

export function getDaltonBootRiveDisplayMode(): DaltonBootRiveDisplayMode {
  if (!BOOT_USE_RIVE) return 'bundled';
  const expoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  if (expoGo) {
    return RIVE_EMBED_DISABLED ? 'bundled' : 'embed';
  }
  const riv = DALTON_BOOT_RIVE_URL;
  if (riv && /^https:\/\//i.test(riv) && /\.riv($|\?)/i.test(riv)) {
    return 'native-url';
  }
  if (RIVE_EMBED_DISABLED) {
    return 'bundled';
  }
  return 'embed';
}

export function getDaltonBootRiveAsset(): { url: string } | { source: number } {
  const u = DALTON_BOOT_RIVE_URL;
  if (u && /^https:\/\//i.test(u) && /\.riv($|\?)/i.test(u)) {
    return { url: u };
  }
  return { source: DALTON_BOOT_RIVE };
}
