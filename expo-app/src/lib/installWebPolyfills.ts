import { Image, Platform, type ImageResolvedAssetSource, type ImageSourcePropType } from 'react-native';

function resolveAssetSourcePolyfill(source: ImageSourcePropType): ImageResolvedAssetSource {
  if (typeof source === 'object' && source != null && 'uri' in source && source.uri) {
    return { uri: source.uri, width: source.width ?? 0, height: source.height ?? 0, scale: 1 };
  }
  const mod = source as unknown as {
    uri?: string;
    default?: string | { uri?: string; width?: number; height?: number };
    width?: number;
    height?: number;
  };
  if (typeof mod === 'string') return { uri: mod, width: 0, height: 0, scale: 1 };
  if (typeof mod?.uri === 'string') {
    return { uri: mod.uri, width: mod.width ?? 0, height: mod.height ?? 0, scale: 1 };
  }
  if (typeof mod?.default === 'string') return { uri: mod.default, width: 0, height: 0, scale: 1 };
  if (mod?.default && typeof mod.default === 'object' && typeof mod.default.uri === 'string') {
    return {
      uri: mod.default.uri,
      width: mod.default.width ?? 0,
      height: mod.default.height ?? 0,
      scale: 1,
    };
  }
  return { uri: '', width: 0, height: 0, scale: 1 };
}

/** RN web bundles may omit `Image.resolveAssetSource` — polyfill before any asset render. */
export function installWebPolyfills(): void {
  if (Platform.OS !== 'web') return;
  const img = Image as typeof Image & {
    resolveAssetSource?: (source: ImageSourcePropType) => ImageResolvedAssetSource;
  };
  if (typeof img.resolveAssetSource !== 'function') {
    img.resolveAssetSource = resolveAssetSourcePolyfill;
  }
}
