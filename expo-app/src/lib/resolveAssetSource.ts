import { Image, Platform } from 'react-native';

/** Web-safe wrapper — RN web may not expose `Image.resolveAssetSource`. */
export function resolveAssetSourceUri(moduleId: number): string {
  if (Platform.OS === 'web') {
    const mod = moduleId as unknown as { uri?: string; default?: string | { uri?: string } };
    if (typeof mod === 'string') return mod;
    if (typeof mod?.uri === 'string') return mod.uri;
    if (typeof mod?.default === 'string') return mod.default;
    if (mod?.default && typeof mod.default === 'object' && typeof mod.default.uri === 'string') {
      return mod.default.uri;
    }
    const legacy = Image.resolveAssetSource as ((id: number) => { uri: string } | null) | undefined;
    if (legacy) {
      try {
        const resolved = legacy(moduleId);
        if (resolved?.uri) return resolved.uri;
      } catch {
        /* fall through */
      }
    }
    return '';
  }
  return Image.resolveAssetSource(moduleId).uri;
}
