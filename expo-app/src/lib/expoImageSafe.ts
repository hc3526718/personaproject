import { Image as RNImage, Platform } from 'react-native';

type ExpoImageModule = typeof import('expo-image');

let cached: ExpoImageModule | null | undefined;

/** True when expo-image native module is linked (SDK 54 dev client / store build). */
export function isExpoImageNativeAvailable(): boolean {
  return getExpoImageModule() !== null;
}

/** Lazy-load expo-image so stale dev clients without ExpoImage still boot. */
export function getExpoImageModule(): ExpoImageModule | null {
  if (cached !== undefined) return cached;

  if (Platform.OS === 'web') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      cached = require('expo-image') as ExpoImageModule;
    } catch {
      cached = null;
    }
    return cached;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { requireOptionalNativeModule } = require('expo-modules-core') as {
      requireOptionalNativeModule: (name: string) => unknown;
    };
    if (!requireOptionalNativeModule('ExpoImage')) {
      cached = null;
      return cached;
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require('expo-image') as ExpoImageModule;
  } catch {
    cached = null;
  }
  return cached;
}

/** Best-effort cache warm — expo-image when available, otherwise RN Image.prefetch. */
export async function prefetchRemoteImageUris(uris: string[], limit = 16): Promise<void> {
  const unique = [...new Set(uris.map((u) => u.trim()).filter(Boolean))].slice(0, limit);
  if (!unique.length) return;

  const mod = getExpoImageModule();
  if (mod) {
    await Promise.allSettled(
      unique.map((uri) => mod.Image.prefetch(uri, { cachePolicy: 'memory-disk' })),
    );
    return;
  }

  await Promise.allSettled(unique.map((uri) => RNImage.prefetch(uri)));
}
