import { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { ResizeMode, Video, type AVPlaybackStatus } from 'expo-av';
import {
  AUTH_VIDEO_LAYOUT,
  type AuthVideoVariant,
} from '../constants/daltonAuthVideo';
import { DALTON_BOOT_VIDEO_BG } from '../constants/daltonBootVideo';
import { useBundledBootVideoSource } from '../hooks/useBundledBootVideoSource';

type Props = {
  style?: StyleProp<ViewStyle>;
  variant?: AuthVideoVariant;
  onReady?: () => void;
  onError?: () => void;
  accessibilityLabel?: string;
};

/** Auth-only video loop — bundled `expo-app/assets/VideoP.mp4`, fit (contain), plays on focus. */
export function AuthDaltonVideoLoop({
  style,
  variant = 'form',
  onReady,
  onError,
  accessibilityLabel = 'Loading',
}: Props) {
  const readySent = useRef(false);
  const videoRef = useRef<Video>(null);
  const nativeSource = useBundledBootVideoSource();
  const isFocused = useIsFocused();
  const layout = AUTH_VIDEO_LAYOUT[variant];

  const fireReady = useCallback(() => {
    if (readySent.current) return;
    readySent.current = true;
    onReady?.();
  }, [onReady]);

  useEffect(() => {
    readySent.current = false;
  }, [nativeSource, variant]);

  const playVideo = useCallback(() => {
    void videoRef.current?.playAsync().catch(() => {});
  }, []);

  useEffect(() => {
    if (!isFocused || !nativeSource) return;
    playVideo();
  }, [isFocused, nativeSource, playVideo]);

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
        ref={videoRef}
        source={nativeSource}
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
  },
  video: {
    backgroundColor: DALTON_BOOT_VIDEO_BG,
  },
});
