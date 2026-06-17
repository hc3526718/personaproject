import { useCallback, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { FontAwesome, FontAwesome5 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppleHeroButton } from './AppleHeroButton';
import { DS } from '../designSystem';
import { WEB_MAX_CONTENT_WIDTH } from '../layout/webLayout';

type TourSlide = {
  id: string;
  title: string;
  body: string;
  icon: React.ReactNode;
};

const SLIDES: TourSlide[] = [
  {
    id: 'community',
    title: 'Community',
    body: 'Follow athletes and coaches, share posts, react and comment, discover people, and message members you connect with.',
    icon: <FontAwesome5 name="users" size={28} color={DS.color.gold} solid />,
  },
  {
    id: 'media',
    title: 'Media',
    body: 'Watch training sessions, podcasts, and academy content. Save favourites and explore media from the community.',
    icon: <FontAwesome name="play-circle" size={30} color={DS.color.gold} />,
  },
  {
    id: 'sponsors',
    title: 'Sponsors',
    body: 'Discover brand partners and sponsorship opportunities connected to The Dalton Grant Academy.',
    icon: <FontAwesome name="handshake-o" size={28} color={DS.color.gold} />,
  },
  {
    id: 'events',
    title: 'Events',
    body: 'Browse upcoming events, reserve your place, and check in on the day with QR codes when you attend.',
    icon: <FontAwesome name="calendar" size={28} color={DS.color.gold} />,
  },
  {
    id: 'profile',
    title: 'Profile & settings',
    body: 'Show recent achievements, highlights, and interests on your profile. In Settings, edit your photo and banner, set up 2FA, control friend requests, notifications, privacy, and more.',
    icon: <FontAwesome name="user-circle" size={30} color={DS.color.gold} />,
  },
];

type Props = {
  visible: boolean;
  onComplete: () => void;
};

export function AppWelcomeTourModal({ visible, onComplete }: Props) {
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index] ?? SLIDES[0];
  const isLast = index >= SLIDES.length - 1;

  const goNext = useCallback(() => {
    if (isLast) {
      onComplete();
      setIndex(0);
      return;
    }
    setIndex((i) => Math.min(SLIDES.length - 1, i + 1));
  }, [isLast, onComplete]);

  const skip = useCallback(() => {
    onComplete();
    setIndex(0);
  }, [onComplete]);

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={skip}>
      <View style={[styles.scrim, { paddingTop: insets.top + DS.space.md, paddingBottom: insets.bottom + DS.space.md }]}>
        <View style={styles.card}>
          <View style={styles.topRow}>
            <Text style={styles.kicker}>Introduction</Text>
            <Pressable onPress={skip} hitSlop={12}>
              <Text style={styles.skip}>Skip</Text>
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.iconWrap}>{slide.icon}</View>
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.body}>{slide.body}</Text>
          </ScrollView>

          <View style={styles.dots}>
            {SLIDES.map((s, i) => (
              <View key={s.id} style={[styles.dot, i === index && styles.dotOn]} />
            ))}
          </View>

          <AppleHeroButton onPress={goNext}>
            {isLast ? 'Get started' : 'Next'}
          </AppleHeroButton>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: DS.color.overlayDark80,
    justifyContent: 'center',
    paddingHorizontal: DS.space.lg,
  },
  card: {
    backgroundColor: 'rgba(16,16,16,0.98)',
    borderRadius: DS.radius.xl,
    borderWidth: 1,
    borderColor: DS.color.goldTint30,
    padding: DS.space.lg,
    maxHeight: '88%',
    ...(Platform.OS === 'web'
      ? { maxWidth: WEB_MAX_CONTENT_WIDTH, width: '100%', alignSelf: 'center' }
      : {}),
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: DS.space.md,
  },
  kicker: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: DS.color.gold,
  },
  skip: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 14,
    color: DS.color.textMuted,
  },
  scroll: { paddingBottom: DS.space.md },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: DS.color.goldTint10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: DS.space.lg,
  },
  title: {
    fontFamily: DS.font.heading,
    fontSize: 26,
    color: DS.color.text,
    letterSpacing: 0.8,
    marginBottom: DS.space.sm,
  },
  body: {
    fontFamily: DS.font.body,
    fontSize: 15,
    lineHeight: 23,
    color: DS.color.textMuted,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginVertical: DS.space.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: DS.color.borderHairline,
  },
  dotOn: {
    backgroundColor: DS.color.gold,
    width: 20,
  },
});
