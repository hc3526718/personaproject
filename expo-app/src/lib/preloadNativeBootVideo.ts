import { Platform } from 'react-native';
import { DALTON_BOOT_VIDEO_NATIVE } from '../constants/daltonBootVideo.native';

let preloadStarted = false;

/** Warms bundled VideoP.mp4 via expo-asset without mounting expo-av (avoids dual-Video crashes on iOS). */
export function preloadNativeBootVideo(): void {
  if (Platform.OS === 'web' || preloadStarted) return;
  preloadStarted = true;

  void (async () => {
    try {
      const { Asset } = await import('expo-asset');
      const asset = Asset.fromModule(DALTON_BOOT_VIDEO_NATIVE);
      if (!asset.downloaded) {
        await asset.downloadAsync();
      }
    } catch {
      /* Non-fatal — DaltonVideoLoop still resolves the module require */
    }
  })();
}
