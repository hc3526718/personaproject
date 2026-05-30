import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { warmDaltonBootVideoCache } from '../constants/daltonBootVideo';
import { DaltonVideoLoop } from './DaltonVideoLoop';

/** Hidden preload for auth hero video — mounted once on the auth stack (web + native). */
export function BootVideoWarmup() {
  useEffect(() => {
    warmDaltonBootVideoCache();
  }, []);

  return (
    <View
      style={styles.hidden}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <DaltonVideoLoop style={styles.video} accessibilityLabel="" />
    </View>
  );
}

const styles = StyleSheet.create({
  hidden: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    overflow: 'hidden',
    left: -9999,
    top: 0,
    zIndex: -1,
  },
  video: {
    width: 1,
    height: 1,
  },
});
