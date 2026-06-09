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

/**
 * Auth hero — logo stays visible for the whole screen visit; video plays behind it.
 * Avoids the brief flash when video mounts then errors or covers the logo.
 */
export function AuthWelcomeRiveHero({ height, variant = 'welcome' }: Props) {
  const layout = AUTH_VIDEO_LAYOUT[variant];
  const slotHeight = height ?? layout.slotHeight;
  const logoSize = layout.logoSize;

  return (
    <View style={[styles.slot, { height: slotHeight }]}>
      <View style={styles.videoLayer} pointerEvents="none">
        <AuthDaltonVideoLoop
          style={styles.video}
          variant={variant}
          accessibilityLabel="The Dalton Grant Academy"
        />
      </View>
      <View style={styles.logoLayer} pointerEvents="none">
        <BrandLogo width={logoSize} height={logoSize} />
      </View>
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
    position: 'relative',
  },
  videoLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  logoLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  video: {
    width: '100%',
    height: '100%',
  },
});
