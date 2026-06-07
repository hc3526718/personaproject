import { useCallback, useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FontAwesome } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../auth/AuthContext';
import { AppLoadingIndicator } from '../../components/AppLoadingIndicator';
import { DS } from '../../designSystem';
import { isAppStoreScreenshotMode, isSupabaseConfigured } from '../../lib/env';
import { resolveProfileAvatarSource } from '../../lib/profileAvatar';
import { resolveCanMessagePeer } from '../../roadmap/messagingGateService';
import {
  searchCommunityUsers,
  type CommunityUserSearchRow,
} from '../../roadmap/liveDataService';
import type { CommunityStackParamList } from '../../navigation/types';
import { useCommunityTheme } from './CommunityStylesContext';

type Props = NativeStackScreenProps<CommunityStackParamList, 'NewMessageSearch'>;

function displayLabel(u: CommunityUserSearchRow): string {
  return u.display_name?.trim() || (u.username?.trim() ? `@${u.username.trim()}` : 'Member');
}

export function NewMessageSearchScreen({ navigation }: Props) {
  const { styles, colors } = useCommunityTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const useLive = isSupabaseConfigured() && Boolean(user) && !user?.id.startsWith('demo-');
  const [q, setQ] = useState('');
  const [results, setResults] = useState<CommunityUserSearchRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState<string | null>(null);

  useEffect(() => {
    const term = q.trim().replace(/^@+/, '');
    if (!useLive || term.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(() => {
      void (async () => {
        const rows = await searchCommunityUsers(term, 25);
        if (cancelled) return;
        setResults(rows.filter((r) => r.id !== user?.id));
        setLoading(false);
      })();
    }, 280);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [q, useLive, user?.id]);

  const startConversation = useCallback(
    async (peer: CommunityUserSearchRow) => {
      if (!user?.id || starting) return;
      if (isAppStoreScreenshotMode()) {
        navigation.navigate('MessageThread', { name: displayLabel(peer), peerUserId: peer.id });
        return;
      }
      setStarting(peer.id);
      const gate = await resolveCanMessagePeer(user.id, peer.id);
      setStarting(null);
      if (!gate.ok) {
        Alert.alert('Cannot message', gate.message);
        return;
      }
      navigation.navigate('MessageThread', {
        name: displayLabel(peer),
        peerUserId: peer.id,
        avatarUrl: peer.avatar_url?.trim() || undefined,
      });
    },
    [navigation, starting, user?.id],
  );

  return (
    <View style={styles.root}>
      <View
        style={[
          styles.searchHeaderWrap,
          {
            paddingTop: insets.top + DS.space.md,
            borderBottomWidth: 1,
            borderBottomColor: colors.borderWhite5,
          },
        ]}
      >
        <View style={styles.searchHeader}>
          <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <FontAwesome name="arrow-left" size={20} color={colors.gold} />
          </Pressable>
          <View style={styles.searchInputWrap}>
            <FontAwesome
              name="search"
              size={14}
              color={colors.textMuted}
              style={styles.searchInputIcon}
            />
            <TextInput
              style={styles.searchInputInner}
              placeholder="Search by name or @username"
              placeholderTextColor={colors.textMuted}
              value={q}
              onChangeText={setQ}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />
          </View>
        </View>
      </View>
      <ScrollView
        contentContainerStyle={[styles.commSearchBody, { paddingBottom: 100 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {!useLive ? (
          <Text style={styles.feedEmptyText}>
            Sign in with your account to search for people and start conversations.
          </Text>
        ) : null}
        {useLive && q.trim().length < 2 ? (
          <Text style={styles.feedEmptyText}>Type at least 2 characters to search members.</Text>
        ) : null}
        {useLive && q.trim().length >= 2 && loading ? (
          <AppLoadingIndicator style={{ marginVertical: DS.space.md }} />
        ) : null}
        {useLive && q.trim().length >= 2 && !loading && results.length === 0 ? (
          <Text style={styles.feedEmptyText}>No members match that search.</Text>
        ) : null}
        {results.map((u) => (
          <Pressable
            key={u.id}
            style={styles.searchSuggestUserRow}
            disabled={starting === u.id}
            onPress={() => void startConversation(u)}
          >
            <Image
              source={resolveProfileAvatarSource(u.avatar_url)}
              style={styles.searchSuggestAvatar}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.searchSuggestName}>{u.display_name}</Text>
              {u.username ? (
                <Text style={styles.searchSuggestMeta}>@{u.username}</Text>
              ) : null}
            </View>
            {starting === u.id ? (
              <AppLoadingIndicator size={24} />
            ) : (
              <FontAwesome name="comment-o" size={14} color={colors.gold} />
            )}
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
