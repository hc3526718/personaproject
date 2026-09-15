import type { StyleProp, ViewStyle } from 'react-native';
import { View } from 'react-native';
import DaltonMarkSvg from '../../assets/dga_blk_gld_logo.svg';

type Props = {
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
};

/** Compact black/gold mark for login, sign-up, and secondary auth chrome. */
export function BrandLogoMark({ width = 72, height = 72, style }: Props) {
  return (
    <View style={style} accessibilityRole="image" accessibilityLabel="Dalton logo">
      <DaltonMarkSvg width={width} height={height} />
    </View>
  );
}
