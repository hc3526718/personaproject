import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { DALTON_BOOT_VIDEO_BG } from '../constants/daltonBootVideo';
import { BrandLogo } from './BrandLogo';
import { AuthDaltonVideoLoop } from './AuthDaltonVideoLoop';

type Props = {
  /** Height of the hero slot (welcome / auth). */
  height?: number;
  /** `form` = compact login / sign-up; `welcome` = welcome hub. */
  variant?: 'welcome' | 'form';
};

const VIDEO_READY_TIMEOUT_MS = 6000;

/** Auth hero — loops `assets/VideoP.mp4`; falls back to logo if video fails or stalls. */
export function AuthWelcomeRiveHero({ height, variant = 'welcome' }: Props) {
  const isForm = variant === 'form';
  const slotHeight = height ?? (isForm ? 64 : 140);
  const logoSize = isForm ? 48 : 64;
  const [useFallback, setUseFallback] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

  const showLogoFallback = useCallback(() => {
    setUseFallback(true);
  }, []);

  useEffect(() => {
    setVideoReady(false);
    setUseFallback(false);
  }, [variant, slotHeight]);

  useEffect(() => {
    if (useFallback || videoReady) return;
    const id = setTimeout(showLogoFallback, VIDEO_READY_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [showLogoFallback, useFallback, videoReady]);

  if (useFallback) {
    return (
      <View style={[styles.slot, { height: slotHeight }]}>
        <BrandLogo width={logoSize} height={logoSize} />
      </View>
    );
  }

  return (
    <View style={[styles.slot, { height: slotHeight }]}>
      <AuthDaltonVideoLoop
        style={styles.video}
        onReady={() => setVideoReady(true)}
        onError={showLogoFallback}
        accessibilityLabel="The Dalton Grant Academy"
        deferMount={!isForm}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DALTON_BOOT_VIDEO_BG,
    overflow: 'hidden',
  },
  video: {
    width: '100%',
    height: '100%',
  },
});
