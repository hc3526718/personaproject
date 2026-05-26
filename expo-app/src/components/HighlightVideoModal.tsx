import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { WebView } from 'react-native-webview';
import { FontAwesome } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DS } from '../designSystem';
import {
  isPlayableVideoUrl,
  resolveHighlightPlaybackUrl,
} from '../lib/profileHighlights';
import { isYouTubeUrl } from '../lib/youtube';

type Props = {
  visible: boolean;
  title: string;
  videoUrl: string;
  onClose: () => void;
};

/** Full-screen overlay for profile highlight clips (direct file URL or YouTube embed). */
export function HighlightVideoModal({ visible, title, videoUrl, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const playbackUrl = resolveHighlightPlaybackUrl(videoUrl);
  const playable = playbackUrl != null;
  const useEmbed = isYouTubeUrl(videoUrl);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.topBar}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          <Pressable style={styles.closeBtn} onPress={onClose} accessibilityLabel="Close video">
            <FontAwesome name="times" size={14} color={DS.color.white} />
          </Pressable>
        </View>
        <View style={styles.playerWrap}>
          {playable && useEmbed && playbackUrl ? (
            <WebView
              source={{ uri: playbackUrl }}
              style={styles.embed}
              allowsFullscreenVideo
              mediaPlaybackRequiresUserAction={false}
              javaScriptEnabled
            />
          ) : playable && playbackUrl && isPlayableVideoUrl(playbackUrl) ? (
            <Video
              source={{ uri: playbackUrl }}
              style={styles.video}
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay
              useNativeControls
              isLooping={false}
            />
          ) : (
            <Text style={styles.error}>This highlight does not have a valid video link yet.</Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.94)',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: DS.space.base,
    paddingVertical: DS.space.md,
    gap: DS.space.md,
  },
  title: {
    flex: 1,
    fontFamily: DS.font.bodyMedium,
    fontSize: 17,
    color: DS.color.gold,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: DS.color.goldTint30,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  playerWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: DS.space.md,
  },
  video: {
    width: '100%',
    minHeight: 240,
    maxHeight: '85%',
  },
  embed: {
    width: '100%',
    minHeight: 280,
    maxHeight: '85%',
    backgroundColor: '#000',
  },
  error: {
    fontFamily: DS.font.body,
    fontSize: 15,
    color: DS.color.textMuted,
    textAlign: 'center',
  },
});
