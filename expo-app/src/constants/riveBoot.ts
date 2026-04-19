import Constants, { ExecutionEnvironment } from 'expo-constants';
import { DS } from '../designSystem';

/**
 * Boot / onboarding Rive — display modes:
 *
 * 1. **Bundled (default on dev client / EAS)** — `dalton_animated_logo.riv` via `rive-react-native`.
 *    Most reliable; avoids WebView + rive.app network/cookie issues that could stall the boot UI.
 * 2. **Native URL** — `EXPO_PUBLIC_RIVE_URL` = direct HTTPS URL to a `.riv` file (hosted file).
 * 3. **Cloud embed (opt-in)** — WebView loading `EXPO_PUBLIC_RIVE_EMBED_URL` or the default share embed.
 *    Set **`EXPO_PUBLIC_RIVE_USE_CLOUD_EMBED=1`** to enable on real builds. **Expo Go** still uses embed
 *    by default (no native Rive module), unless `EXPO_PUBLIC_RIVE_DISABLE_EMBED=1` (bounce only).
 *
 * Optional: `EXPO_PUBLIC_RIVE_ARTBOARD`, `EXPO_PUBLIC_RIVE_STATE_MACHINE`, `EXPO_PUBLIC_RIVE_ANIMATION`
 * `EXPO_PUBLIC_BOOT_USE_RIVE=0` → bouncing PNG only.
 */
export const DALTON_BOOT_RIVE = require('../../assets/dalton_animated_logo.riv');

/** Default share embed (same as iframe `src` without wrapper). */
export const DALTON_RIVE_EMBED_DEFAULT =
  'https://rive.app/s/2b5r5odTC0qRPicJRWg9Kw/embed?runtime=rive-renderer';

/** Page background (native splash + boot shell) — keep embed WebView chrome identical. */
export const BOOT_PAGE_BACKGROUND = DS.color.background;

/**
 * Visual scale for Rive **Cloud embed** (WebView). Rive’s hosted page keeps a small artboard;
 * we scale in RN. Override with `EXPO_PUBLIC_RIVE_EMBED_SCALE` (e.g. `3.5`) — clamped 1.25–5.5.
 */
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

/** Direct `.riv` HTTPS URL for **native** Rive only. */
export const DALTON_BOOT_RIVE_URL = envTrim('EXPO_PUBLIC_RIVE_URL');

/** Override embed page URL (must stay `https://rive.app/.../embed...` or compatible). */
export const DALTON_BOOT_RIVE_EMBED_URL = envTrim('EXPO_PUBLIC_RIVE_EMBED_URL');

/** `EXPO_PUBLIC_BOOT_USE_RIVE=0` → use bouncing PNG instead of Rive. */
export const BOOT_USE_RIVE = process.env.EXPO_PUBLIC_BOOT_USE_RIVE !== '0';

/** Skip WebView embed (Expo Go falls back to bounce-only when native Rive is unavailable). */
export const RIVE_EMBED_DISABLED = process.env.EXPO_PUBLIC_RIVE_DISABLE_EMBED === '1';

/** Opt in to Rive Cloud **WebView** embed on dev client / store builds (default is off — use bundled `.riv`). */
export const RIVE_USE_CLOUD_EMBED = process.env.EXPO_PUBLIC_RIVE_USE_CLOUD_EMBED === '1';

export function daltonRiveLayoutProps() {
  return {
    ...(DALTON_BOOT_ARTBOARD ? { artboardName: DALTON_BOOT_ARTBOARD } : {}),
    ...(DALTON_BOOT_STATE_MACHINE ? { stateMachineName: DALTON_BOOT_STATE_MACHINE } : {}),
    ...(DALTON_BOOT_ANIMATION ? { animationName: DALTON_BOOT_ANIMATION } : {}),
  };
}

/**
 * Resolved embed URL (share link). Used by `react-native-webview`, not `rive-react-native`.
 */
export function getDaltonBootRiveEmbedUri(): string {
  const fromEnv = DALTON_BOOT_RIVE_EMBED_URL;
  if (fromEnv && /^https:\/\//i.test(fromEnv)) return fromEnv;
  return DALTON_RIVE_EMBED_DEFAULT;
}

export type DaltonBootRiveDisplayMode = 'native-url' | 'embed' | 'bundled';

/**
 * **native-url** — hosted `.riv` for `rive-react-native`.
 * **embed** — Rive Cloud share embed in WebView (Expo Go default, or when `EXPO_PUBLIC_RIVE_USE_CLOUD_EMBED=1`).
 * **bundled** — local `require` asset (default on dev client / EAS when no hosted `.riv` URL).
 */
export function getDaltonBootRiveDisplayMode(): DaltonBootRiveDisplayMode {
  if (!BOOT_USE_RIVE) return 'bundled';
  const expoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  /** Expo Go has no `rive-react-native` — WebView embed or bounce-only (see `DaltonBootRiveDisplay`). */
  if (expoGo) {
    return RIVE_EMBED_DISABLED ? 'bundled' : 'embed';
  }
  const riv = DALTON_BOOT_RIVE_URL;
  if (riv && /^https:\/\//i.test(riv) && /\.riv($|\?)/i.test(riv)) {
    return 'native-url';
  }
  /** Real builds: bundled `.riv` by default so boot is not tied to rive.app WebView reliability. */
  if (RIVE_USE_CLOUD_EMBED && !RIVE_EMBED_DISABLED) {
    return 'embed';
  }
  return 'bundled';
}

/**
 * `rive-react-native` expects XOR: `url` **or** `source` (not both).
 * Used only when {@link getDaltonBootRiveDisplayMode} is `native-url` or `bundled`.
 */
export function getDaltonBootRiveAsset(): { url: string } | { source: number } {
  const u = DALTON_BOOT_RIVE_URL;
  if (u && /^https:\/\//i.test(u) && /\.riv($|\?)/i.test(u)) {
    return { url: u };
  }
  return { source: DALTON_BOOT_RIVE };
}
