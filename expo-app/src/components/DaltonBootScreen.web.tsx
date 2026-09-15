import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DALTON_BOOT_VIDEO_BG } from '../constants/daltonBootVideo';
import { DS } from '../designSystem';
import { BootCircleLoader } from './BootCircleLoader';
import { BrandLogo } from './BrandLogo';

/** Web app boot — logo + gold ring loader (matches native build 43). */
export function DaltonBootScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <BrandLogo width={160} height={160} />
      <View style={styles.loader}>
        <BootCircleLoader size={64} compact />
      </View>
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
  loader: {
    marginTop: DS.space.lg,
  },
});
