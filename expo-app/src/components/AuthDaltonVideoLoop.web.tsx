import { useCallback, useRef } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { ResizeMode, Video, type AVPlaybackStatus } from 'expo-av';
import { DALTON_BOOT_VIDEO_BG } from '../constants/daltonBootVideo';
import { getDaltonAuthVideoWebUri } from '../constants/daltonAuthVideo';

type Props = {
  style?: StyleProp<ViewStyle>;
  onReady?: () => void;
  onError?: () => void;
  accessibilityLabel?: string;
  deferMount?: boolean;
};

/** Auth-only video loop — static copy of `expo-app/assets/VideoP.mp4` at `/app/VideoP.mp4`. */
export function AuthDaltonVideoLoop({
  style,
  onReady,
  onError,
  accessibilityLabel = 'Loading',
}: Props) {
  const readySent = useRef(false);
  const uri = getDaltonAuthVideoWebUri();

  const fireReady = useCallback(() => {
    if (readySent.current) return;
    readySent.current = true;
    onReady?.();
  }, [onReady]);

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

  return (
    <View
      style={[styles.outer, style]}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
    >
      <Video
        source={{ uri }}
        style={styles.video}
        resizeMode={ResizeMode.COVER}
        isLooping
        shouldPlay
        isMuted
        useNativeControls={false}
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
    width: '100%',
    height: '100%',
    minHeight: 80,
  },
  video: {
    width: '100%',
    height: '100%',
    backgroundColor: DALTON_BOOT_VIDEO_BG,
  },
});
