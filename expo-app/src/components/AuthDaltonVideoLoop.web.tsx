import { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { ResizeMode, Video, type AVPlaybackStatus } from 'expo-av';
import {
  AUTH_VIDEO_LAYOUT,
  getDaltonAuthVideoWebUri,
  type AuthVideoVariant,
} from '../constants/daltonAuthVideo';
import { DALTON_BOOT_VIDEO_BG } from '../constants/daltonBootVideo';

type Props = {
  style?: StyleProp<ViewStyle>;
  variant?: AuthVideoVariant;
  onReady?: () => void;
  onError?: () => void;
  accessibilityLabel?: string;
};

/** Auth-only video loop — `expo-app/assets/VideoP.mp4` at `/app/VideoP.mp4`, fit (contain). */
export function AuthDaltonVideoLoop({
  style,
  variant = 'form',
  onReady,
  onError,
  accessibilityLabel = 'Loading',
}: Props) {
  const readySent = useRef(false);
  const videoRef = useRef<Video>(null);
  const uri = getDaltonAuthVideoWebUri();
  const isFocused = useIsFocused();
  const layout = AUTH_VIDEO_LAYOUT[variant];

  const fireReady = useCallback(() => {
    if (readySent.current) return;
    readySent.current = true;
    onReady?.();
  }, [onReady]);

  const playVideo = useCallback(() => {
    void videoRef.current?.playAsync().catch(() => {});
  }, []);

  useEffect(() => {
    if (!isFocused) return;
    playVideo();
  }, [isFocused, uri, playVideo]);

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
        ref={videoRef}
        source={{ uri }}
        style={[
          styles.video,
          {
            width: `${layout.videoWidthPct * 100}%`,
            maxWidth: layout.maxVideoWidth,
            maxHeight: layout.maxVideoHeight,
          },
        ]}
        resizeMode={ResizeMode.CONTAIN}
        isLooping
        shouldPlay
        isMuted
        useNativeControls={false}
        onLoad={() => {
          fireReady();
          playVideo();
        }}
        onReadyForDisplay={() => {
          fireReady();
          playVideo();
        }}
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
  },
  video: {
    backgroundColor: DALTON_BOOT_VIDEO_BG,
  },
});
