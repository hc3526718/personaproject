import { StyleSheet, View } from 'react-native';
import {
  AUTH_VIDEO_LAYOUT,
  type AuthVideoVariant,
} from '../constants/daltonAuthVideo';
import { DALTON_BOOT_VIDEO_BG } from '../constants/daltonBootVideo';
import { BrandLogo } from './BrandLogo';

type Props = {
  /** Height override for the hero slot. */
  height?: number;
  /** `form` = login / sign-up; `welcome` = landing hub. */
  variant?: AuthVideoVariant;
};

/** Auth hero — static Dalton logo only (build 43 / TestFlight gold standard). */
export function AuthWelcomeRiveHero({ height, variant = 'welcome' }: Props) {
  const layout = AUTH_VIDEO_LAYOUT[variant];
  const slotHeight = height ?? layout.slotHeight;
  const logoSize = layout.logoSize;

  return (
    <View style={[styles.slot, { height: slotHeight }]}>
      <BrandLogo width={logoSize} height={logoSize} />
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
});
