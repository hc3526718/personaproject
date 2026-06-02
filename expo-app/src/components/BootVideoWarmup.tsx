import { useEffect } from 'react';
import { preloadNativeBootVideo } from '../lib/preloadNativeBootVideo';
import { warmDaltonBootVideoCache } from '../constants/daltonBootVideo';

/**
 * Preloads auth hero video without mounting a second `expo-av` player.
 * (Two simultaneous Video instances on iOS release builds can crash at auth mount.)
 */
export function BootVideoWarmup() {
  useEffect(() => {
    warmDaltonBootVideoCache();
    preloadNativeBootVideo();
  }, []);

  return null;
}
