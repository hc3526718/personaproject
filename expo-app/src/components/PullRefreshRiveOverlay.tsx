import { useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import type { DaltonBootRiveError } from './DaltonBootRivePlayer';
import { DaltonBootRiveDisplay } from './DaltonBootRiveDisplay';
import { DS } from '../designSystem';
import { BOOT_USE_RIVE } from '../constants/riveBoot';

/** Shown under the status bar while pull-to-refresh runs (paired with transparent RefreshControl). */
export function PullRefreshRiveOverlay({
  visible,
  topInset,
}: {
  visible: boolean;
  topInset: number;
}) {
  const [riveFailed, setRiveFailed] = useState(false);

  if (!visible) return null;

  const useEmbedRive =
    BOOT_USE_RIVE && Platform.OS !== 'web';
  const showSpinner = !useEmbedRive || riveFailed;

  return (
    <View pointerEvents="none" style={[styles.overlay, { paddingTop: topInset }]}>
      <View style={styles.box}>
        {showSpinner ? (
          <ActivityIndicator size="large" color={DS.color.gold} />
        ) : (
          <DaltonBootRiveDisplay
            style={styles.rive}
            onNativeError={(_e: DaltonBootRiveError) => setRiveFailed(true)}
            onEmbedError={() => setRiveFailed(true)}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    alignItems: 'center',
  },
  box: {
    height: 100,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rive: { width: 120, height: 88 },
});
