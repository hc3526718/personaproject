import { useEffect, useLayoutEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hideNativeSplashWhenBootVisualReady } from '../boot/nativeSplashGate';
import { MAX_NATIVE_SPLASH_WAIT_MS } from '../constants/bootTiming';
import { DALTON_BOOT_VIDEO_BG } from '../constants/daltonBootVideo';
import { DaltonVideoLoop } from './DaltonVideoLoop';

/** App boot screen — loops brand video on pure black. */
export function DaltonBootScreenRive() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const videoStyle = useMemo(() => {
    const box = Math.min(380, Math.round(width * 0.88));
    return { width: box, height: box, maxWidth: '92%' as const };
  }, [width]);

  useEffect(() => {
    const t = setTimeout(() => hideNativeSplashWhenBootVisualReady(), MAX_NATIVE_SPLASH_WAIT_MS);
    return () => clearTimeout(t);
  }, []);

  useLayoutEffect(() => {
    const id = requestAnimationFrame(() => hideNativeSplashWhenBootVisualReady());
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.center}>
        <DaltonVideoLoop
          style={videoStyle}
          onReady={hideNativeSplashWhenBootVisualReady}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: DALTON_BOOT_VIDEO_BG,
    justifyContent: 'center',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: DALTON_BOOT_VIDEO_BG,
  },
});
