import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusReload } from '../hooks/useFocusReload';
import { FontAwesome } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppLoadingIndicator } from '../components/AppLoadingIndicator';
import { MemberProfileView } from '../components/profile/MemberProfileView';
import { DS } from '../designSystem';
import { formatAuthorDisplayName } from '../lib/communityPostBody';
import { isSupabaseConfigured } from '../lib/env';
import { isExpoWeb, webPageShellStyle } from '../layout/webLayout';
import type { CommunityStackParamList, ProfileStackParamList } from '../navigation/types';
import { useAuth } from '../auth/AuthContext';
import { fetchProfileByUserId } from '../roadmap/profileService';
import type { ProfileRow } from '../roadmap/types';
import {
  followUserDirect,
  getFollowCounts,
  hasPendingOutgoingFollowRequest,
  isUserFollowing,
  sendFollowRequest,
  unfollowUserDirect,
} from '../roadmap/followService';
import type { AllowMessagesFrom } from '../messaging/messagingPrefs';
import { resolveCanMessagePeer } from '../roadmap/messagingGateService';

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
  const [followPending, setFollowPending] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [bannerZoomOpen, setBannerZoomOpen] = useState(false);
  const profileRef = useRef(profile);
  profileRef.current = profile;

  const load = useCallback(async () => {
    if (!isSupabaseConfigured() || !userId) {
      setLoading(false);
      return;
    }
    if (!profileRef.current) setLoading(true);
    const row = await fetchProfileByUserId(userId);
    setProfile(row);
    const counts = await getFollowCounts(userId);
    setFollowCounts(counts);
    if (user?.id && user.id !== userId && !user.id.startsWith('demo-')) {
      const [isFollowing, pending] = await Promise.all([
        isUserFollowing(user.id, userId),
        hasPendingOutgoingFollowRequest(user.id, userId),
      ]);
      setFollowing(isFollowing);
      setFollowPending(pending && !isFollowing);
    } else {
      setFollowing(false);
      setFollowPending(false);
    }
    setLoading(false);
  }, [userId, user?.id]);

  useFocusReload(load);

  const bannerSource =
    profile?.banner_url?.trim()
      ? ({ uri: profile.banner_url.trim() } as const)
      : null;

  const displayName = useMemo(() => {
    if (!profile) return 'Profile';
    const label = formatAuthorDisplayName(profile);
    if (label !== 'Member') return label;
    return profile.username?.trim() ? `@${profile.username.trim()}` : 'Member';
  }, [profile]);

  const messageDisplayName = useMemo(() => {
    if (!profile) return displayName;
    const label = formatAuthorDisplayName(profile);
    if (label !== 'Member') return label;
    return profile.username?.trim() ? `@${profile.username.trim()}` : 'Member';
  }, [profile, displayName]);

  const canFollow =
    Boolean(user?.id && !user.id.startsWith('demo-') && user.id !== userId && userId.length > 10);

  const showVerifiedBadge = false;

  const openMessage = async () => {
    if (!canFollow || !user?.id) return;
    const gate = await resolveCanMessagePeer(user.id, userId);
    if (!gate.ok) {
      Alert.alert('Cannot message', gate.message);
      return;
    }
    const parent = navigation.getParent() as unknown as { navigate: (...args: any[]) => void } | undefined;
    if (parent) {
      parent.navigate('Community', {
        screen: 'MessageThread',
        params: {
          peerUserId: userId,
          name: messageDisplayName,
          avatarUrl: profile?.avatar_url?.trim() || undefined,
        },
      });
      return;
    }
    (navigation as any).navigate('MessageThread', {
      peerUserId: userId,
      name: messageDisplayName,
      avatarUrl: profile?.avatar_url?.trim() || undefined,
    });
  };

  const targetDmPolicy = (profile?.allow_messages_from ?? 'everyone') as AllowMessagesFrom;
  const targetRequiresFollowApproval = targetDmPolicy !== 'everyone';

  const toggleFollow = async () => {
    if (!canFollow || !user?.id || followBusy || followPending) return;
    setFollowBusy(true);
    if (following) {
      const ok = await unfollowUserDirect(user.id, userId);
      if (ok) {
        setFollowing(false);
        setFollowCounts((c) => ({ ...c, followers: Math.max(0, c.followers - 1) }));
      }
    } else if (targetRequiresFollowApproval) {
      const ok = await sendFollowRequest(user.id, userId);
      if (ok) {
        setFollowPending(true);
        Alert.alert(
          'Follow request sent',
          'They restrict who can message them. Once they accept your follow request on their Follow requests page, you can start a conversation.',
        );
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

  const demoUser = Boolean(user?.id?.startsWith('demo-'));

  return (
    <View style={[styles.root, webPageShellStyle()]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: 48 + insets.bottom, paddingTop: insets.top },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={10}
          style={[styles.backFab, { top: insets.top + DS.space.sm }]}
        >
          <FontAwesome name="arrow-left" size={18} color="#FFFFFF" />
        </Pressable>

        {loading && !profile ? (
          <AppLoadingIndicator style={{ marginTop: 48 }} />
        ) : profile ? (
          <MemberProfileView
            profile={profile}
            displayName={displayName}
            followCounts={followCounts}
            mode="public"
            showVerifiedBadge={showVerifiedBadge}
            onBannerPress={() => {
              if (bannerSource) setBannerZoomOpen(true);
            }}
            onFollowersPress={() =>
              (navigation as any).navigate('FollowUserList', { userId, mode: 'followers' })
            }
            onFollowingPress={() =>
              (navigation as any).navigate('FollowUserList', { userId, mode: 'following' })
            }
            canFollow={canFollow}
            following={following}
            followPending={followPending}
            followBusy={followBusy}
            onToggleFollow={() => void toggleFollow()}
            onMessage={() => void openMessage()}
          />
        ) : (
          <AppLoadingIndicator style={{ marginTop: 48 }} />
        )}
      </ScrollView>

      <Modal
        visible={bannerZoomOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setBannerZoomOpen(false)}
      >
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
  loadingWrap: {
    flex: 1,
    paddingHorizontal: DS.space.lg,
  },
  scroll: {
    paddingHorizontal: DS.space.lg,
    ...(isExpoWeb() ? { alignItems: 'center' as const } : {}),
  },
  backFab: {
    position: 'absolute',
    left: DS.space.lg,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  bannerZoomBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: DS.space.lg,
    ...(isExpoWeb() ? { maxWidth: 900, alignSelf: 'center' as const, width: '100%' as const } : {}),
  },
  bannerZoomImg: {
    width: '100%',
    height: '70%',
  },
});
