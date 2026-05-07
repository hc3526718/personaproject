import { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthContext';
import { DS } from '../designSystem';

const storageKeyForUser = (userId: string) => `@daltonVerifiedWelcome:v1:${userId}`;

type Props = {
  /** Wait until boot/splash is gone so this sits on top of the main app shell. */
  deferVisible: boolean;
};

/**
 * One-time celebratory overlay when a signed-in user is Dalton verified (`user.daltonVerified`).
 * Dismissal is persisted per user id in AsyncStorage and is not shown again.
 */
export function DaltonVerifiedWelcomeOverlay({ deferVisible }: Props) {
  const insets = useSafeAreaInsets();
  const { ready, user } = useAuth();

  const [dismissLoaded, setDismissLoaded] = useState(false);
  const [alreadyDismissed, setAlreadyDismissed] = useState(false);
  const [hiddenThisSession, setHiddenThisSession] = useState(false);

  const uid = user?.id;
  const verified = Boolean(user?.daltonVerified);
  const eligible = deferVisible && ready && !!uid && verified;

  useEffect(() => {
    setHiddenThisSession(false);
  }, [uid]);

  useEffect(() => {
    if (!uid || !verified) {
      setDismissLoaded(false);
      setAlreadyDismissed(false);
      return;
    }
    let cancelled = false;
    setDismissLoaded(false);
    const key = storageKeyForUser(uid);
    void AsyncStorage.getItem(key).then((raw) => {
      if (cancelled) return;
      setAlreadyDismissed(raw === '1');
      setDismissLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [uid, verified]);

  const persistDismiss = useCallback(async () => {
    if (!uid) return;
    await AsyncStorage.setItem(storageKeyForUser(uid), '1');
  }, [uid]);

  const onDismiss = useCallback(() => {
    setHiddenThisSession(true);
    setAlreadyDismissed(true);
    void persistDismiss();
  }, [persistDismiss]);

  const show =
    eligible && dismissLoaded && !alreadyDismissed && !hiddenThisSession;

  return (
    <Modal
      visible={show}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <View style={styles.scrim} pointerEvents="auto">
        <View style={[styles.card, { marginTop: Math.max(insets.top, DS.space.base) }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close Dalton verified notice"
            hitSlop={12}
            style={styles.closeBtn}
            onPress={onDismiss}
          >
            <FontAwesome name="times" size={20} color={DS.color.textMuted} />
          </Pressable>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.cardScroll}
          >
            <View style={styles.iconWrap}>
              <FontAwesome name="certificate" size={28} color={DS.color.gold} />
            </View>
            <Text style={styles.title}>DALTON VERIFIED</Text>
            <Text style={styles.lead}>Your profile is verified as Dalton.</Text>

            <Text style={styles.body}>
              Dalton verified creators and hosts unlock trusted tools across the platform: verified
              media creation, clearer discovery for your audience, and features designed for coaches
              and athletes who partner with Dalton.
            </Text>
            <Text style={styles.body}>
              Tap continue when you&apos;re ready — this message appears once after verification.
              You can resume what you were doing right away.
            </Text>

            <Pressable style={styles.primaryCta} onPress={onDismiss}>
              <Text style={styles.primaryCtaTxt}>Continue</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: DS.color.overlayDark80,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: DS.space.lg,
    paddingBottom: DS.space.xl,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '88%',
    backgroundColor: 'rgba(16,16,16,0.96)',
    borderRadius: DS.radius.xl,
    borderWidth: 1,
    borderColor: DS.color.goldTint30,
    paddingTop: DS.space.xl + 8,
    paddingHorizontal: DS.space.lg,
    paddingBottom: DS.space.lg,
    ...(Platform.OS === 'ios'
      ? {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.35,
          shadowRadius: 16,
        }
      : Platform.OS === 'android'
        ? { elevation: 12 }
        : {}),
  },
  closeBtn: {
    position: 'absolute',
    top: DS.space.md,
    right: DS.space.md,
    zIndex: 2,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  cardScroll: {
    paddingTop: DS.space.sm,
    paddingHorizontal: DS.space.sm,
    paddingBottom: DS.space.sm,
  },
  iconWrap: {
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: DS.color.goldTint10,
    borderWidth: 1,
    borderColor: DS.color.goldTint30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: DS.space.base,
  },
  title: {
    fontFamily: DS.font.heading,
    fontSize: 26,
    letterSpacing: 1.2,
    color: DS.color.gold,
    textAlign: 'center',
    marginBottom: DS.space.sm,
  },
  lead: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 16,
    color: DS.color.text,
    textAlign: 'center',
    marginBottom: DS.space.lg,
  },
  body: {
    fontFamily: DS.font.body,
    fontSize: 14,
    lineHeight: 22,
    color: DS.color.textMuted,
    marginBottom: DS.space.base,
    textAlign: 'center',
  },
  primaryCta: {
    marginTop: DS.space.lg,
    alignSelf: 'stretch',
    backgroundColor: DS.color.gold,
    paddingVertical: DS.space.md,
    borderRadius: DS.radius.lg,
    alignItems: 'center',
  },
  primaryCtaTxt: {
    fontFamily: DS.font.bodyBold,
    fontSize: 15,
    letterSpacing: 0.8,
    color: DS.color.background,
  },
});
