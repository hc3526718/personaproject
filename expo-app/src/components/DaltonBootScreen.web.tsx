import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DALTON_BOOT_VIDEO_BG } from '../constants/daltonBootVideo';
import { DaltonVideoLoop } from './DaltonVideoLoop';

/** Web app boot — loops brand video on pure black. */
export function DaltonBootScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <DaltonVideoLoop style={styles.video} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: DALTON_BOOT_VIDEO_BG,
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
    maxWidth: 360,
    maxHeight: 360,
  },
});
