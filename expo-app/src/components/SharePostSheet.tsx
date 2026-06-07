import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { FontAwesome, FontAwesome5 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DS } from '../designSystem';
import { copyTextToClipboard } from '../lib/clipboard';
import { buildPostShareMessage, loadSharePostTargets, type SharePostTarget } from '../lib/sharePostTargets';
import { DALTON_LOGO_FINAL_IMG } from '../constants/brandAssets';

type Props = {
  visible: boolean;
  onClose: () => void;
  postId: string;
  authorName: string;
  bodyText: string;
  userId: string | undefined;
  onShareToUser: (target: SharePostTarget, message: string) => void;
  onCopied?: () => void;
};

type ExternalShareApp = {
  key: string;
  label: string;
  icon: ReactNode;
  open: (message: string) => Promise<void>;
};

function targetAvatar(target: SharePostTarget) {
  if (target.avatarUrl) return { uri: target.avatarUrl };
  return DALTON_LOGO_FINAL_IMG;
}

export function SharePostSheet({
  visible,
  onClose,
  postId,
  authorName,
  bodyText,
  userId,
  onShareToUser,
  onCopied,
}: Props) {
  const insets = useSafeAreaInsets();
  const [targets, setTargets] = useState<SharePostTarget[]>([]);
  const [loading, setLoading] = useState(false);

  const shareMessage = buildPostShareMessage(authorName, bodyText, postId);

  useEffect(() => {
    if (!visible || !userId) {
      setTargets([]);
      return;
    }
    let alive = true;
    setLoading(true);
    void loadSharePostTargets(userId).then((rows) => {
      if (!alive) return;
      setTargets(rows);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [visible, userId]);

  const copyLink = useCallback(async () => {
    const ok = await copyTextToClipboard(shareMessage);
    onClose();
    if (ok) onCopied?.();
  }, [shareMessage, onClose, onCopied]);

  const openNativeShare = useCallback(async () => {
    onClose();
    try {
      await Share.share({
        title: `${authorName} · The Dalton Grant Academy`,
        message: shareMessage,
      });
    } catch {
      /* dismissed */
    }
  }, [authorName, shareMessage, onClose]);

  const externalApps: ExternalShareApp[] = [
    {
      key: 'whatsapp',
      label: 'WhatsApp',
      icon: <FontAwesome5 name="whatsapp" size={22} color="#25D366" />,
      open: async (msg) => {
        const url =
          Platform.OS === 'web'
            ? `https://wa.me/?text=${encodeURIComponent(msg)}`
            : `whatsapp://send?text=${encodeURIComponent(msg)}`;
        if (await Linking.canOpenURL(url)) await Linking.openURL(url);
        else await openNativeShare();
      },
    },
    {
      key: 'telegram',
      label: 'Telegram',
      icon: <FontAwesome5 name="telegram-plane" size={22} color="#229ED9" />,
      open: async (msg) => {
        const url = `https://t.me/share/url?url=${encodeURIComponent(msg)}`;
        if (await Linking.canOpenURL(url)) await Linking.openURL(url);
        else await openNativeShare();
      },
    },
    {
      key: 'messages',
      label: 'Messages',
      icon: <FontAwesome name="comment" size={22} color={DS.color.gold} />,
      open: async (msg) => {
        const url = Platform.select({
          ios: `sms:&body=${encodeURIComponent(msg)}`,
          android: `sms:?body=${encodeURIComponent(msg)}`,
          default: `sms:?body=${encodeURIComponent(msg)}`,
        });
        if (url && (await Linking.canOpenURL(url))) await Linking.openURL(url);
        else await openNativeShare();
      },
    },
    {
      key: 'messenger',
      label: 'Messenger',
      icon: <FontAwesome5 name="facebook-messenger" size={22} color="#0084FF" />,
      open: async (msg) => {
        const url = `fb-messenger://share?link=${encodeURIComponent(msg)}`;
        if (await Linking.canOpenURL(url)) await Linking.openURL(url);
        else await openNativeShare();
      },
    },
    {
      key: 'more',
      label: 'Share to…',
      icon: <FontAwesome name="share-alt" size={20} color={DS.color.gold} />,
      open: openNativeShare,
    },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, DS.space.md) }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.handle} />
          <Text style={styles.title}>Share post</Text>

          <Text style={styles.sectionLabel}>Send to</Text>
          {loading ? (
            <ActivityIndicator color={DS.color.gold} style={styles.loader} />
          ) : targets.length === 0 ? (
            <Text style={styles.emptyHint}>
              {userId ? 'Follow athletes or message someone to share here.' : 'Sign in to share with people you know.'}
            </Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.peopleRow}>
              {targets.map((t) => (
                <Pressable
                  key={t.id}
                  style={styles.personChip}
                  onPress={() => {
                    onClose();
                    setTimeout(() => onShareToUser(t, shareMessage), 0);
                  }}
                >
                  <Image source={targetAvatar(t)} style={styles.personAvatar} />
                  <Text style={styles.personName} numberOfLines={2}>
                    {t.name.split(' ')[0]}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}

          <Text style={styles.sectionLabel}>Share via</Text>
          <View style={styles.appsRow}>
            {externalApps.map((app) => (
              <Pressable
                key={app.key}
                style={styles.appChip}
                onPress={() => {
                  onClose();
                  setTimeout(() => void app.open(shareMessage), 0);
                }}
              >
                <View style={styles.appIconWrap}>{app.icon}</View>
                <Text style={styles.appLabel}>{app.label}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable style={styles.copyRow} onPress={() => void copyLink()}>
            <FontAwesome name="clipboard" size={16} color={DS.color.gold} />
            <Text style={styles.copyText}>Copy post text</Text>
          </Pressable>

          <Pressable style={styles.cancelRow} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: DS.color.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: DS.color.borderWhite5,
    paddingHorizontal: DS.space.base,
    paddingTop: DS.space.sm,
    maxHeight: '78%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: DS.color.borderWhite5,
    marginBottom: DS.space.sm,
  },
  title: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 16,
    color: DS.color.text,
    marginBottom: DS.space.sm,
  },
  sectionLabel: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: DS.color.textMuted,
    marginTop: DS.space.sm,
    marginBottom: DS.space.xs,
  },
  loader: { marginVertical: DS.space.md },
  emptyHint: {
    fontFamily: DS.font.body,
    fontSize: 13,
    color: DS.color.textMuted,
    marginBottom: DS.space.sm,
  },
  peopleRow: {
    gap: DS.space.sm,
    paddingVertical: DS.space.xs,
    paddingRight: DS.space.sm,
  },
  personChip: {
    width: 68,
    alignItems: 'center',
    gap: 6,
  },
  personAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: DS.color.goldTint30,
  },
  personName: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 11,
    color: DS.color.text,
    textAlign: 'center',
  },
  appsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: DS.space.md,
    paddingVertical: DS.space.sm,
  },
  appChip: {
    width: 72,
    alignItems: 'center',
    gap: 6,
  },
  appIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: DS.color.goldTint10,
    borderWidth: 1,
    borderColor: DS.color.goldTint30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appLabel: {
    fontFamily: DS.font.body,
    fontSize: 11,
    color: DS.color.textMuted,
    textAlign: 'center',
  },
  copyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: DS.color.borderWhite5,
    marginTop: DS.space.xs,
  },
  copyText: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 15,
    color: DS.color.text,
  },
  cancelRow: {
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: DS.color.borderWhite5,
    alignItems: 'center',
  },
  cancelText: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 16,
    color: DS.color.textMuted,
  },
});
