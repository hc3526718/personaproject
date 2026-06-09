import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  AUTH_VIDEO_LAYOUT,
  type AuthVideoVariant,
} from '../constants/daltonAuthVideo';
import { DALTON_BOOT_VIDEO_BG } from '../constants/daltonBootVideo';
import { BrandLogo } from './BrandLogo';
import { AuthDaltonVideoLoop } from './AuthDaltonVideoLoop';

type Props = {
  /** Height override for the hero slot. */
  height?: number;
  /** `form` = login / sign-up; `welcome` = landing hub. */
  variant?: AuthVideoVariant;
};

const VIDEO_READY_TIMEOUT_MS = 8000;

/** Auth hero — `assets/VideoP.mp4` (fit/contain); logo fallback if video fails. */
export function AuthWelcomeRiveHero({ height, variant = 'welcome' }: Props) {
  const layout = AUTH_VIDEO_LAYOUT[variant];
  const slotHeight = height ?? layout.slotHeight;
  const logoSize = variant === 'form' ? 48 : 64;
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
        variant={variant}
        onReady={() => setVideoReady(true)}
        onError={showLogoFallback}
        accessibilityLabel="The Dalton Grant Academy"
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
