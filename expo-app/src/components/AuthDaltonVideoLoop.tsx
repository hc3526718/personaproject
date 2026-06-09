import { useCallback, useEffect, useRef, useState } from 'react';
import {
  InteractionManager,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { ResizeMode, Video, type AVPlaybackStatus } from 'expo-av';
import { DALTON_BOOT_VIDEO_BG } from '../constants/daltonBootVideo';
import { useBundledBootVideoSource } from '../hooks/useBundledBootVideoSource';

type Props = {
  style?: StyleProp<ViewStyle>;
  onReady?: () => void;
  onError?: () => void;
  accessibilityLabel?: string;
  deferMount?: boolean;
};

/** Auth-only video loop — bundled `expo-app/assets/VideoP.mp4` (native). */
export function AuthDaltonVideoLoop({
  style,
  onReady,
  onError,
  accessibilityLabel = 'Loading',
  deferMount = true,
}: Props) {
  const readySent = useRef(false);
  const nativeSource = useBundledBootVideoSource();
  const [mountVideo, setMountVideo] = useState(!deferMount);

  useEffect(() => {
    if (!deferMount) {
      setMountVideo(true);
      return;
    }
    setMountVideo(false);
    const task = InteractionManager.runAfterInteractions(() => {
      setMountVideo(true);
    });
    return () => task.cancel();
  }, [deferMount, nativeSource]);

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

  if (!nativeSource || !mountVideo) {
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
        resizeMode={ResizeMode.COVER}
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
