import type { StyleProp, ViewStyle } from 'react-native';
import { View } from 'react-native';
import MainLogoSvg from '../../assets/Main_Logo.svg';

type Props = {
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
};

/** Main Dalton mark for auth, boot, settings, and other non-boot surfaces. */
export function BrandLogo({ width = 160, height = 160, style }: Props) {
  return (
    <View style={style} accessibilityRole="image" accessibilityLabel="Dalton logo">
      <MainLogoSvg width={width} height={height} />
    </View>
  );
}
