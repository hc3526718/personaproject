import { useCallback, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { ResizeMode, Video, type AVPlaybackStatus } from 'expo-av';
import { DALTON_BOOT_VIDEO_BG } from '../constants/daltonBootVideo';
import { DALTON_BOOT_VIDEO_NATIVE } from '../constants/daltonBootVideo.native';

type Props = {
  style?: StyleProp<ViewStyle>;
  /** Called once when the first frame is ready to show. */
  onReady?: () => void;
  onError?: () => void;
  accessibilityLabel?: string;
};

/** Native: loops bundled `assets/VideoP.mp4`. Web uses `DaltonVideoLoop.web.tsx`. */
export function DaltonVideoLoop({
  style,
  onReady,
  onError,
  accessibilityLabel = 'Loading',
}: Props) {
  const readySent = useRef(false);
  const nativeSource = DALTON_BOOT_VIDEO_NATIVE;

  const fireReady = useCallback(() => {
    if (readySent.current) return;
    readySent.current = true;
    onReady?.();
  }, [onReady]);

  useEffect(() => {
    readySent.current = false;
  }, [nativeSource]);

  const onPlaybackStatus = useCallback(
    (status: AVPlaybackStatus) => {
      if (!status.isLoaded) {
        if ('error' in status && status.error) onError?.();
        return;
      }
      if (status.isPlaying || status.positionMillis > 0) fireReady();
    },
    [fireReady, onError],
  );

  if (!nativeSource) {
    return (
      <View
        style={[styles.outer, style]}
        accessibilityRole="progressbar"
        accessibilityLabel={accessibilityLabel}
      />
    );
  }

  return (
    <View
      style={[styles.outer, style]}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
    >
      <Video
        source={nativeSource}
        style={styles.video}
        resizeMode={ResizeMode.CONTAIN}
        isLooping
        shouldPlay
        isMuted
        onLoad={() => fireReady()}
        onReadyForDisplay={() => fireReady()}
        onPlaybackStatusUpdate={onPlaybackStatus}
        onError={() => onError?.()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DALTON_BOOT_VIDEO_BG,
  },
  video: {
    width: '100%',
    height: '100%',
    backgroundColor: DALTON_BOOT_VIDEO_BG,
  },
});
