import { useEffect } from 'react';
import { preloadNativeBootVideo } from '../lib/preloadNativeBootVideo';
import { warmDaltonAuthVideoCache } from '../constants/daltonAuthVideo';

/**
 * Preloads auth hero video without mounting a second `expo-av` player.
 * (Two simultaneous Video instances on iOS release builds can crash at auth mount.)
 */
export function BootVideoWarmup() {
  useEffect(() => {
    warmDaltonAuthVideoCache();
    preloadNativeBootVideo();
  }, []);

  return null;
}
