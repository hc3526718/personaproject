import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { DaltonVideoLoop } from './DaltonVideoLoop';

type Props = {
  style?: StyleProp<ViewStyle>;
  /** Box size (width & height) for the looping video. */
  size?: number;
};

/** Standard Dalton loading indicator — loops brand video. */
export function AppLoadingIndicator({ style, size = 72 }: Props) {
  return (
    <View style={[styles.wrap, style]}>
      <DaltonVideoLoop style={{ width: size, height: size }} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
