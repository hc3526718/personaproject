import { useEffect, useState } from 'react';
import { DALTON_BOOT_VIDEO_NATIVE } from '../constants/daltonBootVideoNativeAsset.native';

type BootVideoSource = { uri: string } | number;

/**
 * Resolves `expo-app/assets/VideoP.mp4` to a local file URI on device (large assets need expo-asset).
 */
export function useBundledBootVideoSource(): BootVideoSource | null {
  const [source, setSource] = useState<BootVideoSource | null>(DALTON_BOOT_VIDEO_NATIVE);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { Asset } = await import('expo-asset');
        const asset = Asset.fromModule(DALTON_BOOT_VIDEO_NATIVE);
        if (!asset.downloaded) {
          await asset.downloadAsync();
        }
        if (cancelled) return;
        const uri = asset.localUri ?? asset.uri;
        if (uri) setSource({ uri });
      } catch {
        if (!cancelled) setSource(DALTON_BOOT_VIDEO_NATIVE);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return source;
}
