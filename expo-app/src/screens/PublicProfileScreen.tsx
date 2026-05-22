import { useCallback, useMemo, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { FontAwesome } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppLoadingIndicator } from '../components/AppLoadingIndicator';
import { AppleHeroButton } from '../components/AppleHeroButton';
import { DS } from '../designSystem';
import { DALTON_LOGO_FINAL_IMG } from '../constants/brandAssets';
import { formatAuthorDisplayName } from '../lib/communityPostBody';
import { isSupabaseConfigured } from '../lib/env';
import type { CommunityStackParamList, ProfileStackParamList } from '../navigation/types';
import { useAuth } from '../auth/AuthContext';
import { fetchProfileByUserId } from '../roadmap/profileService';
import type { ProfileRow } from '../roadmap/types';
import {
  followUserDirect,
  getFollowCounts,
  isUserFollowing,
  unfollowUserDirect,
} from '../roadmap/followService';

type Props =
  | NativeStackScreenProps<CommunityStackParamList, 'PublicProfile'>
  | NativeStackScreenProps<ProfileStackParamList, 'PublicProfile'>;

export function PublicProfileScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const userId = route.params.userId;
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [followCounts, setFollowCounts] = useState({ followers: 0, following: 0 });
  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [bannerZoomOpen, setBannerZoomOpen] = useState(false);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured() || !userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const row = await fetchProfileByUserId(userId);
    setProfile(row);
    const counts = await getFollowCounts(userId);
    setFollowCounts(counts);
    if (user?.id && user.id !== userId && !user.id.startsWith('demo-')) {
      setFollowing(await isUserFollowing(user.id, userId));
    } else {
      setFollowing(false);
    }
    setLoading(false);
  }, [userId, user?.id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const headerTitle = profile ? formatAuthorDisplayName(profile) : 'Profile';

  const bannerSource =
    profile?.banner_url?.trim()
      ? ({ uri: profile.banner_url.trim() } as const)
      : null;

  const displayLine = useMemo(() => {
    if (!profile) return headerTitle;
    const label = formatAuthorDisplayName(profile);
    if (label !== 'Member') return label;
    return profile.username?.trim() ? `@${profile.username.trim()}` : 'Member';
  }, [profile, headerTitle]);

  const canFollow =
    Boolean(user?.id && !user.id.startsWith('demo-') && user.id !== userId && userId.length > 10);

  const toggleFollow = async () => {
    if (!canFollow || !user?.id || followBusy) return;
    setFollowBusy(true);
    if (following) {
      const ok = await unfollowUserDirect(user.id, userId);
      if (ok) {
        setFollowing(false);
        setFollowCounts((c) => ({ ...c, followers: Math.max(0, c.followers - 1) }));
      }
    } else {
      const ok = await followUserDirect(user.id, userId);
      if (ok) {
        setFollowing(true);
        setFollowCounts((c) => ({ ...c, followers: c.followers + 1 }));
      }
    }
    setFollowBusy(false);
  };

  return (
    <View style={styles.root}>
      <View style={[styles.top, { paddingTop: insets.top + DS.space.md }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.backHit}>
          <FontAwesome name="arrow-left" size={20} color={DS.color.gold} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {headerTitle}
        </Text>
        <View style={{ width: 28 }} />
      </View>
      {loading ? (
        <AppLoadingIndicator style={{ marginTop: 32 }} />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.body, { paddingBottom: 48 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            style={[styles.bannerBleed, { marginHorizontal: -DS.space.lg }]}
            onPress={() => {
              if (bannerSource) setBannerZoomOpen(true);
            }}
          >
            {bannerSource ? (
              <Image source={bannerSource} style={styles.bannerImg} resizeMode="cover" />
            ) : (
              <View style={styles.bannerPlaceholder} />
            )}
          </Pressable>

          <View style={styles.avatarWrap}>
            <Image
              source={profile?.avatar_url?.trim() ? { uri: profile.avatar_url.trim() } : DALTON_LOGO_FINAL_IMG}
              style={styles.avatar}
            />
          </View>

          {canFollow ? (
            <View style={styles.followBtnWrap}>
              <AppleHeroButton
                loading={followBusy}
                onPress={() => void toggleFollow()}
                style={styles.followGoldBtn}
              >
                {following ? 'Following' : 'Follow'}
              </AppleHeroButton>
            </View>
          ) : null}

          <Text style={styles.name}>{displayLine}</Text>
          {profile?.username?.trim() ? (
            <Text style={styles.handle}>@{profile.username.trim()}</Text>
          ) : null}
          {profile?.persona_role ? (
            <Text style={styles.role}>{profile.persona_role}</Text>
          ) : null}
          {profile?.sports?.length ? (
            <Text style={styles.meta}>{profile.sports.join(' · ')}</Text>
          ) : null}

          <View style={styles.followStatsRow}>
            <Pressable
              onPress={() => navigation.navigate('FollowUserList', { userId, mode: 'followers' })}
              disabled={Boolean(user?.id && user.id.startsWith('demo-'))}
              hitSlop={8}
            >
              <Text style={styles.followStatsTxt}>
                <Text style={styles.followStatsNum}>{followCounts.followers}</Text>
                {' Followers'}
              </Text>
            </Pressable>
            <Text style={styles.followStatsSep}> · </Text>
            <Pressable
              onPress={() => navigation.navigate('FollowUserList', { userId, mode: 'following' })}
              disabled={Boolean(user?.id && user.id.startsWith('demo-'))}
              hitSlop={8}
            >
              <Text style={styles.followStatsTxt}>
                <Text style={styles.followStatsNum}>{followCounts.following}</Text>
                {' Following'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardKicker}>ABOUT</Text>
            <Text style={styles.bio}>
              {profile?.bio?.trim() ||
                profile?.discovery_source?.trim() ||
                'This athlete is part of the Dalton Access community.'}
            </Text>
          </View>
        </ScrollView>
      )}

      <Modal visible={bannerZoomOpen} transparent animationType="fade" onRequestClose={() => setBannerZoomOpen(false)}>
        <Pressable style={styles.bannerZoomBackdrop} onPress={() => setBannerZoomOpen(false)}>
          {bannerSource ? (
            <Image source={bannerSource} style={styles.bannerZoomImg} resizeMode="contain" />
          ) : null}
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DS.color.background },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: DS.space.base,
    paddingBottom: DS.space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DS.color.borderWhite5,
  },
  backHit: { padding: DS.space.xs },
  title: {
    flex: 1,
    textAlign: 'center',
    fontFamily: DS.font.bodyMedium,
    fontSize: 16,
    color: DS.color.text,
  },
  body: { paddingHorizontal: DS.space.lg },
  bannerBleed: {
    height: 140,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    overflow: 'hidden',
    marginBottom: DS.space.md,
    backgroundColor: DS.color.surface,
  },
  bannerImg: { width: '100%', height: '100%' },
  bannerPlaceholder: {
    flex: 1,
    backgroundColor: '#000000',
  },
  avatarWrap: { alignItems: 'center', marginTop: -56, marginBottom: DS.space.sm },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: DS.color.gold,
    backgroundColor: DS.color.background,
  },
  followBtnWrap: {
    alignSelf: 'stretch',
    paddingHorizontal: DS.space.xl,
    marginBottom: DS.space.md,
  },
  followGoldBtn: {
    backgroundColor: DS.color.gold,
    borderColor: DS.color.gold,
    minHeight: 44,
  },
  name: {
    fontFamily: DS.font.heading,
    fontSize: 22,
    color: DS.color.text,
    textAlign: 'center',
    letterSpacing: 1,
  },
  handle: {
    marginTop: 4,
    fontFamily: DS.font.bodyMedium,
    fontSize: 14,
    color: DS.color.gold,
    textAlign: 'center',
  },
  role: {
    marginTop: DS.space.xs,
    fontFamily: DS.font.bodyMedium,
    fontSize: 13,
    color: DS.color.gold,
    textAlign: 'center',
  },
  meta: {
    marginTop: DS.space.sm,
    fontFamily: DS.font.body,
    fontSize: 13,
    color: DS.color.textMuted,
    textAlign: 'center',
  },
  followStatsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: DS.space.md,
    flexWrap: 'wrap',
  },
  followStatsTxt: {
    fontFamily: DS.font.body,
    fontSize: 14,
    color: DS.color.textMuted,
  },
  followStatsNum: {
    fontFamily: DS.font.bodyBold,
    fontSize: 14,
    color: DS.color.text,
  },
  followStatsSep: {
    fontFamily: DS.font.body,
    fontSize: 14,
    color: DS.color.textMuted,
    marginHorizontal: DS.space.xs,
  },
  card: {
    marginTop: DS.space.xl,
    padding: DS.space.lg,
    borderRadius: DS.radius.lg,
    backgroundColor: DS.color.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: DS.color.borderWhite5,
  },
  cardKicker: {
    fontFamily: DS.font.bodyBold,
    fontSize: 11,
    letterSpacing: 2,
    color: DS.color.gold,
    marginBottom: DS.space.sm,
  },
  bio: {
    fontFamily: DS.font.body,
    fontSize: 14,
    color: DS.color.textMuted,
    lineHeight: 22,
  },
  bannerZoomBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: DS.space.lg,
  },
  bannerZoomImg: {
    width: '100%',
    height: '70%',
  },
});
