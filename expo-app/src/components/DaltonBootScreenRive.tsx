import { useEffect, useLayoutEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hideNativeSplashWhenBootVisualReady } from '../boot/nativeSplashGate';
import { MAX_NATIVE_SPLASH_WAIT_MS } from '../constants/bootTiming';
import { DALTON_BOOT_VIDEO_BG } from '../constants/daltonBootVideo';
import { DS } from '../designSystem';
import { BootCircleLoader } from './BootCircleLoader';
import { BrandLogo } from './BrandLogo';

/** App boot screen — logo + gold ring loader (matches build 43 / native splash). */
export function DaltonBootScreenRive() {
  const insets = useSafeAreaInsets();

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
        <BrandLogo width={160} height={160} />
        <View style={styles.loader}>
          <BootCircleLoader size={64} compact />
        </View>
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
  loader: {
    marginTop: DS.space.lg,
  },
});
