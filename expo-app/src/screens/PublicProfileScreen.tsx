import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FontAwesome } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DS } from '../designSystem';
import { DALTON_LOGO_FINAL_IMG } from '../constants/brandAssets';
import { isSupabaseConfigured } from '../lib/env';
import { formatAuthorDisplayName } from '../lib/communityPostBody';
import type { CommunityStackParamList } from '../navigation/types';
import { fetchProfileByUserId } from '../roadmap/profileService';
import type { ProfileRow } from '../roadmap/types';

type Props = NativeStackScreenProps<CommunityStackParamList, 'PublicProfile'>;

export function PublicProfileScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const userId = route.params.userId;
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileRow | null>(null);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured() || !userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const row = await fetchProfileByUserId(userId);
    setProfile(row);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const label = profile
    ? formatAuthorDisplayName({
        display_name: profile.display_name,
        first_name: profile.first_name,
        last_name: profile.last_name,
      })
    : 'Profile';

  return (
    <View style={styles.root}>
      <View style={[styles.top, { paddingTop: insets.top + DS.space.md }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.backHit}>
          <FontAwesome name="arrow-left" size={20} color={DS.color.gold} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {label}
        </Text>
        <View style={{ width: 28 }} />
      </View>
      {loading ? (
        <ActivityIndicator color={DS.color.gold} style={{ marginTop: 32 }} />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.body, { paddingBottom: 48 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.avatarWrap}>
            <Image
              source={profile?.avatar_url?.trim() ? { uri: profile.avatar_url.trim() } : DALTON_LOGO_FINAL_IMG}
              style={styles.avatar}
            />
          </View>
          <Text style={styles.name}>{label}</Text>
          {profile?.persona_role ? (
            <Text style={styles.role}>{profile.persona_role}</Text>
          ) : null}
          {profile?.sports?.length ? (
            <Text style={styles.meta}>{profile.sports.join(' · ')}</Text>
          ) : null}
          <View style={styles.card}>
            <Text style={styles.cardKicker}>ABOUT</Text>
            <Text style={styles.bio}>
              {profile?.discovery_source?.trim() || 'This athlete is part of the Grant Access community.'}
            </Text>
          </View>
        </ScrollView>
      )}
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
  body: { padding: DS.space.lg },
  avatarWrap: { alignItems: 'center', marginBottom: DS.space.md },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: DS.color.gold,
  },
  name: {
    fontFamily: DS.font.heading,
    fontSize: 22,
    color: DS.color.mist,
    textAlign: 'center',
    letterSpacing: 1,
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
});
