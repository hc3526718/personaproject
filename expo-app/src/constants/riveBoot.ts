import Constants, { ExecutionEnvironment } from 'expo-constants';
import { DS } from '../designSystem';

/**
 * Official Rive runtimes (same `.riv` / renderer model; RN wraps native iOS + Android):
 * - React Native: https://rive.app/docs/runtimes/react-native/react-native
 * - Expo setup: https://rive.app/docs/runtimes/react-native/adding-rive-to-expo
 * - Apple (iOS): https://rive.app/docs/runtimes/apple/apple
 * - Android: https://rive.app/docs/runtimes/android/android
 *
 * Boot / pull-to-refresh Rive:
 * - **embed** (default everywhere): Rive Cloud WebView (`DALTON_RIVE_EMBED_DEFAULT` or `EXPO_PUBLIC_RIVE_EMBED_URL`).
 * - **bundled**: set `EXPO_PUBLIC_RIVE_USE_BUNDLED=1` — native `dalton_animated_logo.riv` via `rive-react-native` (dev client / EAS only).
 * - **native-url**: `EXPO_PUBLIC_RIVE_URL` + `EXPO_PUBLIC_RIVE_USE_NATIVE_URL=1` for HTTPS-hosted `.riv` in the native player.
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
const RIVE_FORCE_EMBED = process.env.EXPO_PUBLIC_RIVE_FORCE_EMBED === '1';

function useBundledRiveFile(): boolean {
  return envTrim('EXPO_PUBLIC_RIVE_USE_BUNDLED') === '1';
}

function debugLog(hypothesisId: string, location: string, message: string, data: Record<string, unknown>) {
  // #region agent log
  fetch('http://127.0.0.1:7386/ingest/bab823b9-460d-4f52-948e-3e1cf5b36c4f', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '6e09fa' },
    body: JSON.stringify({
      sessionId: '6e09fa',
      runId: 'pre-fix',
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
}

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
  if (!BOOT_USE_RIVE) return 'embed';
  if (RIVE_FORCE_EMBED) {
    debugLog('H1', 'src/constants/riveBoot.ts:getDaltonBootRiveDisplayMode', 'mode=embed (forced)', {
      executionEnvironment: Constants.executionEnvironment,
      riveEmbedDisabled: RIVE_EMBED_DISABLED,
      useBundled: useBundledRiveFile(),
      riveUrl: DALTON_BOOT_RIVE_URL,
      embedUrl: getDaltonBootRiveEmbedUri(),
    });
    return 'embed';
  }
  const expoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  if (expoGo) {
    return RIVE_EMBED_DISABLED ? 'bundled' : 'embed';
  }
  const riv = DALTON_BOOT_RIVE_URL;
  if (
    riv &&
    /^https:\/\//i.test(riv) &&
    /\.riv($|\?)/i.test(riv) &&
    envTrim('EXPO_PUBLIC_RIVE_USE_NATIVE_URL') === '1'
  ) {
    debugLog('H1', 'src/constants/riveBoot.ts:getDaltonBootRiveDisplayMode', 'mode=native-url', {
      executionEnvironment: Constants.executionEnvironment,
      riveEmbedDisabled: RIVE_EMBED_DISABLED,
      useBundled: useBundledRiveFile(),
      riveUrl: riv,
    });
    return 'native-url';
  }
  if (RIVE_EMBED_DISABLED || useBundledRiveFile()) {
    debugLog('H1', 'src/constants/riveBoot.ts:getDaltonBootRiveDisplayMode', 'mode=bundled', {
      executionEnvironment: Constants.executionEnvironment,
      riveEmbedDisabled: RIVE_EMBED_DISABLED,
      useBundled: useBundledRiveFile(),
      riveUrl: riv,
      bundledModuleId: DALTON_BOOT_RIVE,
    });
    return 'bundled';
  }
  debugLog('H1', 'src/constants/riveBoot.ts:getDaltonBootRiveDisplayMode', 'mode=embed', {
    executionEnvironment: Constants.executionEnvironment,
    riveEmbedDisabled: RIVE_EMBED_DISABLED,
    useBundled: useBundledRiveFile(),
    riveUrl: riv,
    embedUrl: getDaltonBootRiveEmbedUri(),
  });
  return 'embed';
}

export function getDaltonBootRiveAsset(): { url: string } | { source: number } {
  const u = DALTON_BOOT_RIVE_URL;
  if (u && /^https:\/\//i.test(u) && /\.riv($|\?)/i.test(u)) {
    debugLog('H2', 'src/constants/riveBoot.ts:getDaltonBootRiveAsset', 'asset=url', { url: u });
    return { url: u };
  }
  debugLog('H2', 'src/constants/riveBoot.ts:getDaltonBootRiveAsset', 'asset=source(module)', {
    bundledModuleId: DALTON_BOOT_RIVE,
  });
  return { source: DALTON_BOOT_RIVE };
}
