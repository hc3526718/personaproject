import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Image,
  type LayoutChangeEvent,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FontAwesome, FontAwesome5 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthContext';
import { BrandLogo } from '../components/BrandLogo';
import { PullRefreshRiveOverlay } from '../components/PullRefreshRiveOverlay';
import { DS, tabRootTitleText } from '../designSystem';
import { assertCanMessageRecipient } from '../messaging/messagingPolicy';
import { isSupabaseConfigured } from '../lib/env';
import * as ImagePicker from 'expo-image-picker';
import { Video, ResizeMode } from 'expo-av';
import { canSubmitCommunityPost } from '../roadmap/communityPolicy';
import { getSupabase } from '../lib/supabase';
import {
  getPostCommentCount,
  getPostLikeCount,
  getUserHasLikedPost,
  likePost,
  unlikePost,
} from '../roadmap/communityInteractionsService';
import {
  enrichPostWithAuthor,
  insertCommunityPost,
  listRecentCommunityPosts,
  listAllEvents,
  subscribeCommunityPosts,
  type CommunityPostFeedRow,
} from '../roadmap/liveDataService';
import {
  clearInAppNotifications,
  listInAppNotifications,
  markAllInAppNotificationsRead,
  markInAppNotificationRead,
  type InAppNotification,
} from '../roadmap/notificationsService';
import {
  getOrCreateConversationId,
  listConversationSummaries,
  listMessages,
  sendTextMessage,
  type ConversationSummary,
} from '../roadmap/messagingService';
import type { MessageRow } from '../roadmap/types';
import type { CommunityStackParamList, SponsorsStackParamList } from '../navigation/types';
import { useActionBanner } from '../actionBanner/ActionBannerContext';
import { useRefreshWithMinimum } from '../hooks/useRefreshWithMinimum';
import { pullRefreshControl } from '../lib/pullRefreshUi';

type CProps<K extends keyof CommunityStackParamList> = NativeStackScreenProps<
  CommunityStackParamList,
  K
>;

type BrandPartnerScreenProps =
  | NativeStackScreenProps<CommunityStackParamList, 'BrandPartner'>
  | NativeStackScreenProps<SponsorsStackParamList, 'BrandPartner'>;

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const highlightBodyTextStyle = {
  fontFamily: DS.font.body,
  fontSize: 14,
  lineHeight: 22,
  color: DS.color.text,
} as const;

const highlightGoldTextStyle = {
  fontFamily: DS.font.bodyMedium,
  fontSize: 14,
  lineHeight: 22,
  color: DS.color.gold,
  fontWeight: '600' as const,
};

const notifBodyStrongStyle = {
  fontFamily: DS.font.bodyMedium,
  fontWeight: '600' as const,
  color: DS.color.text,
};

const notifBodyRestStyle = {
  fontFamily: DS.font.body,
  color: DS.color.text,
};

function RichTextMentions({ text }: { text: string }) {
  const parts = useMemo(() => {
    const re = /([@#][A-Za-z0-9_]+)/g;
    const out: { k: string; v: string; gold: boolean }[] = [];
    let i = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const start = m.index;
      const end = start + m[0].length;
      if (start > i) out.push({ k: `${i}-t`, v: text.slice(i, start), gold: false });
      out.push({ k: `${start}-m`, v: m[0], gold: true });
      i = end;
    }
    if (i < text.length) out.push({ k: `${i}-e`, v: text.slice(i), gold: false });
    return out.length ? out : [{ k: '0', v: text, gold: false }];
  }, [text]);
  return (
    <Text style={styles.postBody}>
      {parts.map((p) =>
        p.gold ? (
          <Text key={p.k} style={styles.mentionGold}>
            {p.v}
          </Text>
        ) : (
          p.v
        ),
      )}
    </Text>
  );
}

function HighlightBody({ text, query }: { text: string; query: string }) {
  const nodes = useMemo(() => {
    const q = query.trim();
    if (!q) return [{ key: '0', segment: text as string, gold: false }];
    const re = new RegExp(`(${escapeRegExp(q)})`, 'gi');
    return text.split(re).map((segment, i) => ({
      key: `${i}-${segment.slice(0, 8)}`,
      segment,
      gold: segment.toLowerCase() === q.toLowerCase(),
    }));
  }, [text, query]);
  return (
    <Text style={highlightBodyTextStyle}>
      {nodes.map(({ key, segment, gold }) =>
        gold ? (
          <Text key={key} style={highlightGoldTextStyle}>
            {segment}
          </Text>
        ) : (
          segment
        ),
      )}
    </Text>
  );
}

const FILTERS = ['All', 'Sprints', 'Jumps', 'Youth', 'Academy'] as const;

const FEED_AVATAR_PLACEHOLDER =
  'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?q=80&w=200&auto=format&fit=crop';

function formatRelativePostTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const diff = Math.max(0, Date.now() - t);
  const sec = Math.floor(diff / 1000);
  if (sec < 45) return 'Just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  if (hr < 48) return 'Yesterday';
  const d = Math.floor(hr / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

type ComposerMedia = {
  kind: 'image' | 'video';
  uri: string;
  durationMs?: number;
};

const MAX_IMAGES = 7;
const MAX_VIDEOS = 2;
const MAX_VIDEO_MS = 30_000;

function clampComposerMedia(items: ComposerMedia[]): ComposerMedia[] {
  const vids = items.filter((m) => m.kind === 'video').slice(0, MAX_VIDEOS);
  const imgs = items.filter((m) => m.kind === 'image').slice(0, MAX_IMAGES);
  return [...vids, ...imgs].slice(0, MAX_IMAGES + MAX_VIDEOS);
}

function pickerAssetIsVideo(a: ImagePicker.ImagePickerAsset): boolean {
  const mt = (a.mimeType ?? '').toLowerCase();
  if (mt.startsWith('video/')) return true;
  const t = (a as { type?: string }).type;
  return t === 'video';
}

/** Expo reports `duration` in seconds for videos; treat missing as unknown (not video). */
function pickerVideoDurationMs(a: ImagePicker.ImagePickerAsset): number | undefined {
  if (!pickerAssetIsVideo(a)) return undefined;
  if (typeof a.duration !== 'number' || Number.isNaN(a.duration)) return MAX_VIDEO_MS;
  return Math.round(a.duration * 1000);
}

function inferContentType(kind: ComposerMedia['kind'], uri: string): string {
  const u = uri.toLowerCase();
  if (kind === 'image') {
    if (u.endsWith('.png')) return 'image/png';
    if (u.endsWith('.webp')) return 'image/webp';
    return 'image/jpeg';
  }
  if (u.endsWith('.mov')) return 'video/quicktime';
  return 'video/mp4';
}

function inferExt(kind: ComposerMedia['kind'], uri: string): string {
  const u = uri.toLowerCase();
  const dot = u.lastIndexOf('.');
  const ext = dot !== -1 ? u.slice(dot + 1).split('?')[0] : '';
  if (ext && ext.length <= 5) return ext;
  return kind === 'image' ? 'jpg' : 'mp4';
}

export function CommunityFeedScreen({ navigation }: CProps<'CommunityFeed'>) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [feedPosts, setFeedPosts] = useState<CommunityPostFeedRow[]>([]);
  const [feedLoading, setFeedLoading] = useState(() => isSupabaseConfigured());

  const liveMode = isSupabaseConfigured();
  const isDemoUser = Boolean(user?.id.startsWith('demo-'));
  const demoCommunityAudience = !liveMode || isDemoUser || (!user && liveMode);

  const loadFeed = useCallback(async () => {
    if (!liveMode) {
      setFeedLoading(false);
      return;
    }
    setFeedLoading(true);
    const rows = await listRecentCommunityPosts(30);
    setFeedPosts(rows);
    setFeedLoading(false);
  }, [liveMode]);

  const reloadFeedQuiet = useCallback(async () => {
    if (!liveMode) return;
    const rows = await listRecentCommunityPosts(30);
    setFeedPosts(rows);
  }, [liveMode]);

  const { refreshing, onRefresh } = useRefreshWithMinimum(reloadFeedQuiet, 4000);

  useEffect(() => {
    void loadFeed();
  }, [loadFeed]);

  useFocusEffect(
    useCallback(() => {
      void loadFeed();
    }, [loadFeed]),
  );

  useEffect(() => {
    if (!liveMode) return;
    return subscribeCommunityPosts((change) => {
      if (change.event === 'DELETE') {
        setFeedPosts((prev) => prev.filter((p) => p.id !== change.id));
        return;
      }
      void enrichPostWithAuthor(change.row).then((full) => {
        setFeedPosts((prev) => {
          const i = prev.findIndex((p) => p.id === full.id);
          if (i >= 0) {
            const next = [...prev];
            next[i] = full;
            return next;
          }
          return [full, ...prev]
            .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
            .slice(0, 30);
        });
      });
    });
  }, [liveMode]);

  return (
    <View style={styles.root}>
      <PullRefreshRiveOverlay visible={refreshing} topInset={insets.top} />
      <View style={[styles.feedHeader, { paddingTop: insets.top + DS.space.md }]}>
        <View style={styles.feedHeaderRow}>
          <Text style={styles.communityTitle}>COMMUNITY</Text>
          <View style={styles.feedHeaderActions}>
            <Pressable onPress={() => navigation.navigate('CommunitySearch')}>
              <FontAwesome name="search" size={20} color={DS.color.gold} />
            </Pressable>
            <Pressable onPress={() => navigation.navigate('MessagesInbox')}>
              <FontAwesome5 name="paper-plane" size={18} color={DS.color.gold} solid={false} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Notifications"
              onPress={() => navigation.navigate('Notifications')}
              hitSlop={8}
            >
              <FontAwesome name="bell-o" size={20} color={DS.color.gold} />
            </Pressable>
          </View>
        </View>
      </View>
      <ScrollView
        contentContainerStyle={[styles.feedList, { paddingBottom: 124 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        refreshControl={liveMode ? pullRefreshControl(refreshing, onRefresh) : undefined}
      >
        {demoCommunityAudience ? (
          <>
            {liveMode && isDemoUser && user ? (
              <View style={styles.feedBanner}>
                <Text style={styles.feedBannerText}>
                  You are in offline demo sign-in. Use a real Supabase account (email or Apple/Google) to
                  post and see live updates across devices.
                </Text>
              </View>
            ) : null}
            {!liveMode ? (
              <Text style={styles.feedSampleKicker}>
                Sample posts · connect Supabase for a live Community feed.
              </Text>
            ) : null}
            {liveMode && !user ? (
              <>
                <Text style={styles.feedEmptyText}>Sign in to post to the community.</Text>
                <Text style={styles.feedSampleKicker}>Sample posts below</Text>
              </>
            ) : null}
            <CommunityDemoPostList navigation={navigation} />
          </>
        ) : (
          <>
            {feedLoading ? (
              <ActivityIndicator color={DS.color.gold} style={{ marginVertical: DS.space.lg }} />
            ) : feedPosts.length === 0 ? (
              <Text style={styles.feedEmptyText}>No posts yet. Yours can be the first.</Text>
            ) : (
              feedPosts.map((p) => (
                <PostCard
                  key={p.id}
                  postId={p.id}
                  avatar={p.author_avatar_url?.trim() ? p.author_avatar_url : FEED_AVATAR_PLACEHOLDER}
                  name={p.author_display_name?.trim() || 'Member'}
                  time={formatRelativePostTime(p.created_at)}
                  body={p.body ?? ''}
                  imageUri={p.attachments?.find((a) => a.kind === 'image')?.uri}
                  media={p.attachments}
                  likes={0}
                  heartFilled={false}
                  comments={0}
                />
              ))
            )}
          </>
        )}
      </ScrollView>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="New post"
        style={[styles.communityFab, { bottom: 58 + Math.max(insets.bottom, 8) }]}
        onPress={() => navigation.navigate('CreateCommunityPost')}
      >
        <FontAwesome name="plus" size={22} color={DS.color.background} />
      </Pressable>
    </View>
  );
}

export function CreateCommunityPostScreen({ navigation }: CProps<'CreateCommunityPost'>) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const liveMode = isSupabaseConfigured();
  const isDemoUser = Boolean(user?.id.startsWith('demo-'));

  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const [media, setMedia] = useState<ComposerMedia[]>([]);
  const [events, setEvents] = useState<{ id: string; title: string; starts_at: string }[]>([]);
  const [eventId, setEventId] = useState<string | null>(null);
  const [eventPickerOpen, setEventPickerOpen] = useState(false);

  const showBanner = useActionBanner();

  useEffect(() => {
    if (!liveMode) return;
    void (async () => {
      const rows = await listAllEvents(100);
      setEvents(rows.map((e) => ({ id: e.id, title: e.title, starts_at: e.starts_at })));
    })();
  }, [liveMode]);

  const openPicker = useCallback(async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not on web', 'Use iOS or Android to pick photos and videos.');
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      quality: 0.92,
      videoMaxDuration: Math.floor(MAX_VIDEO_MS / 1000),
      selectionLimit: MAX_IMAGES + MAX_VIDEOS,
    });

    if (res.canceled) return;

    const nextIncoming: ComposerMedia[] = [];
    for (const a of res.assets) {
      const uri = a.uri;
      if (pickerAssetIsVideo(a)) {
        const durMs = pickerVideoDurationMs(a) ?? MAX_VIDEO_MS;
        if (durMs > MAX_VIDEO_MS) continue;
        nextIncoming.push({ kind: 'video', uri, durationMs: durMs });
      } else if (uri) {
        nextIncoming.push({ kind: 'image', uri });
      }
    }

    setMedia(clampComposerMedia([...media, ...nextIncoming]));
  }, [media]);

  const canPost =
    Boolean(
      user &&
        !isDemoUser &&
        liveMode &&
        media.length > 0 &&
        canSubmitCommunityPost(user.id, { body: caption }) &&
        !busy,
    );

  const removeMedia = useCallback((uri: string) => {
    setMedia((prev) => clampComposerMedia(prev.filter((m) => m.uri !== uri)));
  }, []);

  const submit = useCallback(async () => {
    const picks = clampComposerMedia(media);
    if (!user || isDemoUser || !liveMode) return;
    if (picks.length === 0) {
      Alert.alert('Add media', 'Choose at least one photo or video.');
      return;
    }
    if (!canSubmitCommunityPost(user.id, { body: caption })) {
      Alert.alert('Caption required', 'Add a caption before posting.');
      return;
    }
    setBusy(true);
    try {
      const eventTag = eventId ? `\n\n#event:${eventId}` : '';
      const row = await insertCommunityPost(user.id, `${caption.trim()}${eventTag}`);
      if (!row) {
        Alert.alert('Could not post', 'Check your connection and try again.');
        return;
      }
      const supabase = getSupabase();
      if (supabase && picks.length > 0) {
        for (let i = 0; i < picks.length; i++) {
          const m = picks[i]!;
          const blob = await (await fetch(m.uri)).blob();
          const ext = inferExt(m.kind, m.uri);
          const storage_path = `posts/${row.id}/${Date.now()}-${i}.${ext}`;
          const contentType = inferContentType(m.kind, m.uri);
          const up = await supabase.storage.from('media_assets').upload(storage_path, blob, {
            contentType,
            upsert: false,
          });
          if (up.error) continue;
          const pub = supabase.storage.from('media_assets').getPublicUrl(storage_path);
          const public_url = pub.data.publicUrl ?? null;
          await supabase.from('media_assets').insert({
            owner_id: user.id,
            kind: m.kind,
            storage_path,
            public_url,
            mime_type: contentType,
            visibility: 'public',
            post_id: row.id,
          });
        }
      }
      showBanner('Posted', 'Your post is live in the feed.');
      navigation.goBack();
    } finally {
      setBusy(false);
    }
  }, [user, isDemoUser, liveMode, caption, eventId, navigation, media, showBanner]);

  const first = media[0];

  return (
    <View style={styles.root}>
      <View style={[styles.createTop, { paddingTop: insets.top + DS.space.md }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <FontAwesome name="arrow-left" size={20} color={DS.color.gold} />
        </Pressable>
        <Text style={styles.createTitle}>NEW POST</Text>
        <Pressable
          onPress={() => void submit()}
          disabled={!canPost}
          style={[styles.createPostBtn, !canPost && { opacity: 0.45 }]}
        >
          <Text style={styles.createPostBtnTxt}>{busy ? 'Posting…' : 'Post'}</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.createBody, { paddingBottom: 32 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.composerSectionKicker}>POST PREVIEW (FIRST ATTACHMENT)</Text>
        <View style={styles.composerHero}>
          {first ? (
            <>
              {first.kind === 'image' ? (
                <Image source={{ uri: first.uri }} style={styles.composerHeroInner} resizeMode="cover" />
              ) : (
                <Video
                  source={{ uri: first.uri }}
                  style={styles.composerHeroInner}
                  resizeMode={ResizeMode.COVER}
                  useNativeControls
                  isLooping={false}
                />
              )}
              <Pressable style={styles.mediaRemove} onPress={() => removeMedia(first.uri)} hitSlop={8}>
                <FontAwesome name="times" size={14} color={DS.color.text} />
              </Pressable>
              <Pressable style={styles.composerAddChip} onPress={() => void openPicker()} hitSlop={8}>
                <FontAwesome name="plus" size={12} color={DS.color.background} />
                <Text style={styles.composerAddChipTxt}>Add</Text>
              </Pressable>
            </>
          ) : (
            <Pressable style={styles.composerHeroEmpty} onPress={() => void openPicker()}>
              <FontAwesome name="plus-square-o" size={34} color={DS.color.gold} />
              <Text style={styles.composerHeroEmptyTitle}>Add photos & videos</Text>
              <Text style={styles.composerHeroEmptySub}>
                Up to {MAX_IMAGES} images and {MAX_VIDEOS} videos · max {MAX_VIDEO_MS / 1000}s clips
              </Text>
            </Pressable>
          )}
        </View>

        {media.length > 1 ? (
          <>
            <Text style={[styles.composerSectionKicker, { marginTop: DS.space.md }]}>ALL ATTACHMENTS</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.composerThumbStrip}
            >
              {media.map((m) => (
                <View key={m.uri} style={styles.composerThumbWrap}>
                  <Pressable hitSlop={6} style={styles.composerThumbRemove} onPress={() => removeMedia(m.uri)}>
                    <FontAwesome name="times" size={10} color={DS.color.background} />
                  </Pressable>
                  {m.kind === 'image' ? (
                    <Image source={{ uri: m.uri }} style={styles.composerThumb} />
                  ) : (
                    <>
                      <Video
                        source={{ uri: m.uri }}
                        style={styles.composerThumb}
                        resizeMode={ResizeMode.COVER}
                      />
                      <View style={styles.composerThumbVidBadge} pointerEvents="none">
                        <FontAwesome name="video-camera" size={9} color={DS.color.background} />
                      </View>
                    </>
                  )}
                </View>
              ))}
            </ScrollView>
          </>
        ) : null}

        <Text style={[styles.composerSectionKicker, { marginTop: DS.space.md }]}>CAPTION · MENTIONS · HASHTAGS</Text>
        <View style={styles.captionCard}>
          <TextInput
            value={caption}
            onChangeText={setCaption}
            placeholder={"@coach and #track — say what's happening"}
            placeholderTextColor={DS.color.textMuted}
            multiline
            style={styles.captionInput}
            maxLength={4000}
          />
        </View>

        <Text style={[styles.composerSectionKicker, { marginTop: DS.space.sm }]}>ATTACH EVENT (OPTIONAL)</Text>
        <Pressable
          style={styles.eventTagRow}
          onPress={() => setEventPickerOpen(true)}
          disabled={!events.length}
        >
          <FontAwesome name="calendar" size={16} color={DS.color.gold} />
          <Text style={styles.eventTagTxt}>
            {eventId ? `${events.find((e) => e.id === eventId)?.title ?? 'Event'}` : 'Select an upcoming event'}
          </Text>
          <FontAwesome name="chevron-right" size={14} color={DS.color.textMuted} />
        </Pressable>
      </ScrollView>

      {eventPickerOpen ? (
        <View style={styles.eventPickerOverlay}>
          <Pressable style={styles.eventPickerBackdrop} onPress={() => setEventPickerOpen(false)} />
          <View style={[styles.eventPickerSheet, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <Text style={styles.eventPickerTitle}>Attach an event</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {events.map((e) => (
                <Pressable
                  key={e.id}
                  style={styles.eventPickerRow}
                  onPress={() => {
                    setEventId(e.id);
                    setEventPickerOpen(false);
                  }}
                >
                  <Text style={styles.eventPickerRowTitle}>{e.title}</Text>
                  <Text style={styles.eventPickerRowMeta}>{new Date(e.starts_at).toLocaleString()}</Text>
                </Pressable>
              ))}
              <Pressable
                style={[styles.eventPickerRow, { borderBottomWidth: 0 }]}
                onPress={() => {
                  setEventId(null);
                  setEventPickerOpen(false);
                }}
              >
                <Text style={[styles.eventPickerRowTitle, { color: DS.color.textMuted }]}>Clear event</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      ) : null}
    </View>
  );
}

type SecondaryReaction = { kind: 'fire' | 'clap' | 'lightbulb'; count: number };

function PostCard({
  postId: _postId,
  avatar,
  name,
  time,
  body,
  bodyParagraphs,
  imageUri,
  media,
  likes: initialLikes,
  heartFilled: initialLiked,
  secondary: initialSecondary,
  comments: initialCommentCount,
  badge,
  onPressCard,
}: {
  postId: string;
  avatar: string;
  name: string;
  time: string;
  body?: string;
  bodyParagraphs?: string[];
  imageUri?: string;
  media?: { kind: 'image' | 'video' | 'file'; uri: string; name?: string }[];
  likes: number;
  heartFilled?: boolean;
  secondary?: SecondaryReaction;
  comments: number;
  badge?: string;
  onPressCard?: () => void;
}) {
  const { user } = useAuth();
  const liveMode = isSupabaseConfigured() && user && !user.id.startsWith('demo-');
  const [liked, setLiked] = useState(!!initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikes);
  const [secondary, setSecondary] = useState<SecondaryReaction | undefined>(initialSecondary);
  const [commentCount, setCommentCount] = useState(initialCommentCount);
  const [syncing, setSyncing] = useState(false);
  const showActionBanner = useActionBanner();

  useEffect(() => {
    if (!liveMode || !user) return;
    let cancelled = false;
    void (async () => {
      const [has, cLikes, cComments] = await Promise.all([
        getUserHasLikedPost(_postId, user.id),
        getPostLikeCount(_postId),
        getPostCommentCount(_postId),
      ]);
      if (cancelled) return;
      setLiked(has);
      setLikeCount(cLikes);
      setCommentCount(cComments);
    })();
    return () => {
      cancelled = true;
    };
  }, [_postId, liveMode, user]);

  const bodyText = useMemo(
    () => (bodyParagraphs ? bodyParagraphs.join('\n\n') : body ?? ''),
    [body, bodyParagraphs],
  );

  const bodySection =
    bodyParagraphs ? (
      <View style={styles.postBodyBlock}>
        {bodyParagraphs.map((p, i) => (
          <RichTextMentions key={i} text={p} />
        ))}
      </View>
    ) : (
      <RichTextMentions text={body ?? ''} />
    );

  const mediaItems = useMemo(
    () => (media ?? []).filter((m) => m.kind === 'image' || m.kind === 'video'),
    [media],
  );
  const [carouselW, setCarouselW] = useState(0);
  const scrollRef = useRef<ScrollView | null>(null);
  const onCarouselLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const w = e.nativeEvent.layout.width;
      if (w && w !== carouselW) setCarouselW(w);
    },
    [carouselW],
  );

  const mediaSection =
    mediaItems.length > 0 ? (
      <View onLayout={onCarouselLayout} style={styles.postCarouselWrap}>
        <ScrollView
          ref={(r) => {
            scrollRef.current = r;
          }}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
        >
          {mediaItems.map((m, idx) => (
            <View
              key={`${m.kind}-${m.uri}`}
              style={[styles.postCarouselItem, carouselW ? { width: carouselW } : null]}
            >
              {m.kind === 'image' ? (
                <Image source={{ uri: m.uri }} style={styles.postCarouselMedia} />
              ) : (
                <Video
                  source={{ uri: m.uri }}
                  style={styles.postCarouselMedia}
                  resizeMode={ResizeMode.COVER}
                  shouldPlay={idx === 0}
                  isLooping={false}
                  onPlaybackStatusUpdate={(st) => {
                    if (!('didJustFinish' in st)) return;
                    if (st.didJustFinish && scrollRef.current && carouselW) {
                      const next = Math.min(mediaItems.length - 1, idx + 1);
                      scrollRef.current.scrollTo({ x: next * carouselW, animated: true });
                    }
                  }}
                />
              )}
            </View>
          ))}
        </ScrollView>
      </View>
    ) : imageUri ? (
      <Image source={{ uri: imageUri }} style={styles.postImage} />
    ) : null;

  const toggleLike = useCallback(() => {
    if (!liveMode || !user) {
      setLiked((v) => {
        setLikeCount((c) => (v ? c - 1 : c + 1));
        return !v;
      });
      return;
    }
    if (syncing) return;
    setSyncing(true);
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => Math.max(0, c + (next ? 1 : -1)));
    void (async () => {
      const ok = next ? await likePost(_postId, user.id) : await unlikePost(_postId, user.id);
      if (!ok) {
        setLiked((v) => !v);
        setLikeCount((c) => Math.max(0, c + (next ? -1 : 1)));
      } else {
        const cLikes = await getPostLikeCount(_postId);
        setLikeCount(cLikes);
        if (next) showActionBanner('Liked', `${name}'s post`);
      }
      setSyncing(false);
    })();
  }, [liveMode, user, syncing, liked, _postId, name, showActionBanner]);

  const sharePost = useCallback(async () => {
    try {
      await Share.share({
        title: `${name} · Dalton`,
        message: `${name}\n\n${bodyText}`.slice(0, 4000),
      });
    } catch {
      /* dismissed */
    }
  }, [bodyText, name]);

  const pickEmojiReaction = useCallback(() => {
    const apply = (kind: SecondaryReaction['kind']) => {
      setSecondary((prev) => {
        if (prev?.kind === kind) {
          return { kind, count: prev.count + 1 };
        }
        const seed = initialSecondary?.kind === kind ? initialSecondary.count : 0;
        return { kind, count: seed + 1 };
      });
      const label = kind === 'fire' ? 'Fire' : kind === 'clap' ? 'Clap' : 'Insight';
      showActionBanner('Reaction sent', label);
    };
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', '🔥 Fire', '👏 Clap', '💡 Insight'],
          cancelButtonIndex: 0,
        },
        (i) => {
          if (i === 1) apply('fire');
          if (i === 2) apply('clap');
          if (i === 3) apply('lightbulb');
        },
      );
    } else {
      Alert.alert('React', 'Choose a reaction', [
        { text: '🔥', onPress: () => apply('fire') },
        { text: '👏', onPress: () => apply('clap') },
        { text: '💡', onPress: () => apply('lightbulb') },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  }, [initialSecondary, showActionBanner]);

  const openPostMenu = useCallback(() => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Report post', 'Copy link', 'Hide from feed'],
          cancelButtonIndex: 0,
          destructiveButtonIndex: 1,
        },
        (i) => {
          if (i === 1) {
            Alert.alert('Report', 'Thanks — moderation syncs with Supabase when live.');
          }
          if (i === 2) {
            Alert.alert('Copied', 'Post link copied to clipboard (demo).');
          }
          if (i === 3) {
            Alert.alert('Hidden', 'Feed preferences will sync when the API is connected.');
          }
        },
      );
    } else {
      Alert.alert('Post menu', undefined, [
        {
          text: 'Report post',
          style: 'destructive',
          onPress: () => Alert.alert('Report', 'Thanks — moderation syncs when live.'),
        },
        { text: 'Copy link', onPress: () => Alert.alert('Copied', 'Demo copy.') },
        { text: 'Hide from feed', onPress: () => {} },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  }, []);

  const openComments = useCallback(() => {
    setCommentCount((c) => c);
    Alert.alert(
      'Comments',
      liveMode
        ? 'Comments are stored in Supabase (`post_comments`). Full thread UI is next; for now this shows the live count.'
        : 'Thread view will load from Supabase (`post_comments`) when the backend is wired. You can still demo the counter locally.',
      [
        {
          text: 'Add demo comment',
          onPress: () => {
            setCommentCount((c) => c + 1);
            showActionBanner('Comment added', 'Full threads sync when comments API is wired.');
          },
        },
        { text: 'OK', style: 'cancel' },
      ],
    );
  }, [liveMode, showActionBanner]);

  return (
    <View style={styles.postCard}>
      <View style={styles.postTop}>
        <Image source={{ uri: avatar }} style={styles.postAvatar} />
        <View style={styles.postMetaCol}>
          <Text style={styles.postName}>{name}</Text>
          <Text style={styles.postTime}>{time}</Text>
        </View>
        {badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}
        <Pressable style={styles.postMore} hitSlop={8} onPress={openPostMenu}>
          <FontAwesome name="ellipsis-h" size={16} color={DS.color.textMuted} />
        </Pressable>
      </View>
      {onPressCard ? (
        <Pressable
          onPress={onPressCard}
          style={({ pressed }) => (pressed ? { opacity: 0.92 } : null)}
        >
          {bodySection}
          {mediaSection}
        </Pressable>
      ) : (
        <>
          {bodySection}
          {mediaSection}
        </>
      )}
      <View style={styles.postActions}>
        <View style={styles.postActionsLeft}>
          <Pressable style={styles.actionPill} onPress={toggleLike}>
            <FontAwesome
              name={liked ? 'heart' : 'heart-o'}
              size={14}
              color={liked ? DS.color.gold : DS.color.textMuted}
            />
            <Text style={styles.actionTxt}> {likeCount}</Text>
          </Pressable>
          {secondary ? (
            <Pressable style={styles.actionPill} onPress={pickEmojiReaction}>
              {secondary.kind === 'fire' ? (
                <FontAwesome5 name="fire" size={13} color="#f97316" solid />
              ) : null}
              {secondary.kind === 'clap' ? (
                <Text style={styles.clapEmoji}>👏</Text>
              ) : null}
              {secondary.kind === 'lightbulb' ? (
                <FontAwesome5 name="lightbulb" size={13} color="#facc15" solid />
              ) : null}
              <Text style={styles.actionTxt}> {secondary.count}</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.actionPill} onPress={pickEmojiReaction}>
              <Text style={styles.actionTxt}>＋ 😊</Text>
            </Pressable>
          )}
          <Pressable style={styles.actionPill} onPress={pickEmojiReaction}>
            <FontAwesome name="smile-o" size={14} color={DS.color.textMuted} />
          </Pressable>
          <Pressable style={styles.actionPill} onPress={() => void sharePost()}>
            <FontAwesome name="share-alt" size={14} color={DS.color.textMuted} />
          </Pressable>
        </View>
        <Pressable style={styles.actionPill} onPress={openComments}>
          <Text style={styles.actionTxt}>{commentCount} </Text>
          <FontAwesome name="comment-o" size={14} color={DS.color.textMuted} />
        </Pressable>
      </View>
    </View>
  );
}

function CommunityDemoPostList({
  navigation,
}: Pick<CProps<'CommunityFeed'>, 'navigation'>) {
  return (
    <>
      <PostCard
        postId="demo-pb-1"
        avatar="https://picsum.photos/seed/dalton-ava1/200/200"
        name="Jordan Blake"
        time="12m ago"
        body="Track day reps with @TaylorM and @CoachDana felt locked in. Focusing on hips through the drive phase 🚀 #DaltonAthletics #Sprinters #MondayMiles"
        imageUri="https://picsum.photos/seed/dalton-run1/800/520"
        likes={34}
        heartFilled={false}
        secondary={{ kind: 'fire', count: 18 }}
        comments={9}
      />
      <PostCard
        postId="demo-pb-2"
        avatar="https://picsum.photos/seed/dalton-ava2/200/200"
        name="Alex Rivera"
        time="42m ago"
        body="@JordanBlake that ladder session blueprint you shared 🔥 Tagged @YouthClub coaches too — shoutout #DaltonGrant #CoachNetwork"
        media={[
          { kind: 'image', uri: 'https://picsum.photos/seed/dalton-carousel-a/900/560' },
          { kind: 'image', uri: 'https://picsum.photos/seed/dalton-carousel-b/900/560' },
        ]}
        likes={52}
        heartFilled
        secondary={{ kind: 'clap', count: 21 }}
        comments={14}
      />
      <PostCard
        postId="demo-pb-3"
        avatar="https://picsum.photos/seed/dalton-ava3/200/200"
        name="Mia Okonkwo"
        time="2h ago"
        badge="AMBASSADOR"
        body="Recovery stack that’s working this block: mobility + flush ride + hydration check. Trying to stay consistent between dual meets ⚡️ #Recovery #HydrationRoutine #AthleteJournal"
        imageUri="https://picsum.photos/seed/dalton-recovery/780/540"
        likes={67}
        heartFilled={false}
        secondary={{ kind: 'lightbulb', count: 12 }}
        comments={6}
      />
      <PostCard
        postId="demo-pb-4"
        avatar="https://picsum.photos/seed/dalton-ava4/200/200"
        name="Sam Whitaker"
        time="4h ago"
        bodyParagraphs={[
          'Meet week mindset — shorten the warmup story, lengthen the checklist. Clipboard items: spikes, bib, salts, earbuds.',
          '@PerformanceLab posted a slick primer on aisle breathing; pairing that with tonight’s shakeout.',
          '#MeetWeek #DaltonAthletics #HurdlesClub',
        ]}
        likes={41}
        heartFilled={false}
        comments={11}
      />
      <PostCard
        postId="demo-pb-5"
        avatar="https://picsum.photos/seed/dalton-ava5/200/200"
        name="Chen & Ellis Training"
        time="Yesterday"
        body="Youth academy highlight reel is going up tonight — tagging @TaylorM @CoachDana plus #YouthDalton #SprintStarts. Slide into DMs if you want the drill PDF."
        imageUri="https://picsum.photos/seed/dalton-coachposter/820/560"
        likes={156}
        heartFilled={false}
        secondary={{ kind: 'fire', count: 44 }}
        comments={28}
      />
      <PostCard
        postId="demo-pb-6"
        avatar="https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-8.jpg"
        name="Coach Williams"
        time="Yesterday"
        badge="MENTOR"
        body="Nutrition nudge — pre-comp carb window + electrolytes. Mentioning @JordanBlake and @MiaOkonkwo for keeping the locker room chatter positive. 🥦🏃‍♂️💧 #FuelRight #DaltonFam"
        imageUri="https://picsum.photos/seed/dalton-foodtrack/760/520"
        likes={198}
        heartFilled={false}
        secondary={{ kind: 'lightbulb', count: 62 }}
        comments={36}
        onPressCard={() => navigation.navigate('BrandPartner')}
      />
    </>
  );
}

const DEFAULT_RECENT = ['sprint technique', 'Coach Williams', 'high jump'] as const;
const TRENDING = [
  { topic: 'nutrition tips', count: '142 posts this week' },
  { topic: 'recovery methods', count: '89 posts this week' },
  { topic: 'block start', count: '67 posts this week' },
] as const;

export function CommunitySearchScreen({ navigation }: CProps<'CommunitySearch'>) {
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState('');
  const [recent, setRecent] = useState<string[]>([...DEFAULT_RECENT]);
  const runSearch = (query: string) =>
    navigation.navigate('CommunitySearchResults', { query: query.trim() || 'sprint technique' });
  return (
    <View style={styles.root}>
      <View
        style={[
          styles.searchHeaderWrap,
          {
            paddingTop: insets.top + DS.space.md,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: DS.color.borderWhite5,
          },
        ]}
      >
        <View style={styles.searchHeader}>
          <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <FontAwesome name="arrow-left" size={20} color={DS.color.gold} />
          </Pressable>
          <View style={styles.searchInputWrap}>
            <FontAwesome
              name="search"
              size={14}
              color={DS.color.textMuted}
              style={styles.searchInputIcon}
            />
            <TextInput
              style={styles.searchInputInner}
              placeholder="Search posts, people, tags"
              placeholderTextColor={DS.color.textMuted}
              value={q}
              onChangeText={setQ}
              onSubmitEditing={() => runSearch(q)}
              returnKeyType="search"
            />
          </View>
        </View>
      </View>
      <ScrollView
        contentContainerStyle={[styles.commSearchBody, { paddingBottom: 100 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.commSearchSectionTitle}>Recent Searches</Text>
        {recent.map((term) => (
          <View key={term} style={styles.recentRow}>
            <Pressable
              style={styles.recentRowLeft}
              onPress={() => {
                setQ(term);
                runSearch(term);
              }}
            >
              <FontAwesome name="clock-o" size={14} color={DS.color.textMuted} />
              <Text style={styles.recentRowText}>{term}</Text>
            </Pressable>
            <Pressable onPress={() => setRecent((r) => r.filter((x) => x !== term))} hitSlop={8}>
              <FontAwesome name="times" size={14} color={DS.color.textMuted} />
            </Pressable>
          </View>
        ))}
        <Text style={styles.commSearchSectionTitle}>Trending</Text>
        {TRENDING.map((t) => (
          <Pressable key={t.topic} style={styles.trendingRow} onPress={() => runSearch(t.topic)}>
            <FontAwesome5 name="fire" size={14} color="#f97316" solid />
            <View style={{ flex: 1 }}>
              <Text style={styles.trendingTopic}>{t.topic}</Text>
              <Text style={styles.trendingMeta}>{t.count}</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const SEARCH_SORT = ['Recent', 'Top', 'Most Relevant'] as const;
const SEARCH_FILTER_CHIPS = ['All', 'Posts', 'People', 'Videos'] as const;

const SEARCH_RESULT_POSTS: {
  avatar: string;
  name: string;
  time: string;
  body: string;
  imageUri?: string;
  heartFilled?: boolean;
  likes: number;
  comments: number;
}[] = [
  {
    avatar: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-8.jpg',
    name: 'Coach Williams',
    time: '2h',
    body:
      "Perfecting your sprint technique starts with proper block positioning. Here's what I teach my athletes...",
    likes: 24,
    comments: 8,
  },
  {
    avatar: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-5.jpg',
    name: 'Sarah Chen',
    time: '4h',
    body:
      'Finally nailed my sprint technique after months of practice! The key was focusing on arm drive and foot placement 🏃‍♀️',
    imageUri:
      'https://storage.googleapis.com/uxpilot-auth.appspot.com/c68706f822-23f485ad5a9b054c3c84.png',
    heartFilled: true,
    likes: 156,
    comments: 32,
  },
  {
    avatar: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-2.jpg',
    name: 'Marcus Johnson',
    time: '1d',
    body: 'Common mistakes in sprint technique that slow you down. Thread 🧵',
    likes: 89,
    comments: 45,
  },
  {
    avatar: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-7.jpg',
    name: 'Emma Rodriguez',
    time: '2d',
    body: "Video analysis of my sprint technique from yesterday's training. Any feedback?",
    imageUri:
      'https://storage.googleapis.com/uxpilot-auth.appspot.com/14700d91c4-a780d1c2476327e59dd9.png',
    likes: 67,
    comments: 19,
  },
];

export function CommunitySearchResultsScreen({
  navigation,
  route,
}: CProps<'CommunitySearchResults'>) {
  const insets = useSafeAreaInsets();
  const q = route.params?.query?.trim() || 'sprint technique';
  const displayQ = q.length > 28 ? `${q.slice(0, 28)}…` : q;
  const [sortI, setSortI] = useState(0);
  const [chipI, setChipI] = useState(0);
  return (
    <View style={styles.root}>
      <View
        style={[
          styles.searchResultsHeader,
          { paddingTop: insets.top + DS.space.md },
        ]}
      >
        <View style={styles.searchResultsTopRow}>
          <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <FontAwesome name="arrow-left" size={20} color={DS.color.gold} />
          </Pressable>
          <View style={styles.searchInputWrap}>
            <FontAwesome
              name="search"
              size={14}
              color={DS.color.textMuted}
              style={styles.searchInputIcon}
            />
            <Text style={styles.searchResultsInputText} numberOfLines={1}>
              {q}
            </Text>
            <Pressable
              onPress={() => navigation.navigate('CommunitySearch')}
              hitSlop={8}
              style={styles.searchClearHit}
            >
              <FontAwesome name="times" size={14} color={DS.color.textMuted} />
            </Pressable>
          </View>
          <Pressable onPress={() => navigation.navigate('Notifications')}>
            <View>
              <FontAwesome name="bell" size={20} color={DS.color.textMuted} />
              <View style={styles.searchBellDot} />
            </View>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('MessagesInbox')}>
            <FontAwesome5 name="paper-plane" size={18} color={DS.color.textMuted} solid={false} />
          </Pressable>
        </View>
        <View style={styles.sortRow}>
          <Text style={styles.sortLabel}>Sort:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sortChipsInner}
          >
            {SEARCH_SORT.map((label, i) => (
              <Pressable
                key={label}
                onPress={() => setSortI(i)}
                style={[styles.sortChip, sortI === i && styles.sortChipOn]}
              >
                <Text style={sortI === i ? styles.sortChipTextOn : styles.sortChipTextOff}>
                  {label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.searchFilterChipsRow}
        >
          {SEARCH_FILTER_CHIPS.map((label, i) => (
            <Pressable
              key={label}
              onPress={() => setChipI(i)}
              style={[styles.searchFilterChip, chipI === i && styles.searchFilterChipOn]}
            >
              <Text
                style={chipI === i ? styles.searchFilterChipTextOn : styles.searchFilterChipTextOff}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      <ScrollView
        contentContainerStyle={[
          styles.searchResultsList,
          { paddingBottom: 100 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.searchResultCount}>147 results for &quot;{displayQ}&quot;</Text>
        {SEARCH_RESULT_POSTS.map((post, idx) => (
          <Pressable
            key={`${post.name}-${idx}`}
            style={styles.searchResultCard}
            onPress={() => navigation.navigate('CommunityFeed')}
          >
            <View style={styles.searchResultCardTop}>
              <Image source={{ uri: post.avatar }} style={styles.searchResultAvatar} />
              <View style={{ flex: 1 }}>
                <View style={styles.searchResultNameRow}>
                  <Text style={styles.searchResultName}>{post.name}</Text>
                  <Text style={styles.searchResultDot}> • </Text>
                  <Text style={styles.searchResultTime}>{post.time}</Text>
                </View>
                <HighlightBody text={post.body} query={q} />
              </View>
            </View>
            {post.imageUri ? (
              <View style={styles.searchResultMedia}>
                <Image source={{ uri: post.imageUri }} style={styles.searchResultMediaImg} />
                {idx === 3 ? (
                  <View style={styles.searchResultPlay}>
                    <FontAwesome name="play" size={16} color={DS.color.white} />
                  </View>
                ) : null}
              </View>
            ) : null}
            <View style={styles.searchResultActions}>
              <Pressable style={styles.searchResultAction}>
                <FontAwesome
                  name={post.heartFilled ? 'heart' : 'heart-o'}
                  size={14}
                  color={post.heartFilled ? DS.color.error : DS.color.textMuted}
                />
                <Text style={styles.searchResultActionTxt}> {post.likes}</Text>
              </Pressable>
              <Pressable style={styles.searchResultAction}>
                <FontAwesome name="comment-o" size={14} color={DS.color.textMuted} />
                <Text style={styles.searchResultActionTxt}> {post.comments}</Text>
              </Pressable>
              <Pressable style={styles.searchResultAction}>
                <FontAwesome name="share-alt" size={14} color={DS.color.textMuted} />
              </Pressable>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

type NotifRow = {
  id: string;
  unread: boolean;
  avatar?: string;
  icon?: 'calendar' | 'trophy';
  body: ReactNode;
  time: string;
};

const NOTIFICATION_ROWS: NotifRow[] = [
  {
    id: '1',
    unread: true,
    avatar: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-5.jpg',
    body: (
      <>
        <Text style={notifBodyStrongStyle}>Sarah Chen</Text>
        <Text style={notifBodyRestStyle}> liked your post about sprint technique</Text>
      </>
    ),
    time: '2 minutes ago',
  },
  {
    id: '2',
    unread: true,
    avatar: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-8.jpg',
    body: (
      <>
        <Text style={notifBodyStrongStyle}>Coach Williams</Text>
        <Text style={notifBodyRestStyle}>
          {' '}
          commented: &quot;Great improvement on your block start!&quot;
        </Text>
      </>
    ),
    time: '15 minutes ago',
  },
  {
    id: '3',
    unread: true,
    avatar: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-7.jpg',
    body: (
      <>
        <Text style={notifBodyStrongStyle}>Emma Rodriguez</Text>
        <Text style={notifBodyRestStyle}> mentioned you in a comment</Text>
      </>
    ),
    time: '1 hour ago',
  },
  {
    id: '4',
    unread: false,
    avatar: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-2.jpg',
    body: (
      <>
        <Text style={notifBodyStrongStyle}>Marcus Johnson</Text>
        <Text style={notifBodyRestStyle}> started following you</Text>
      </>
    ),
    time: '3 hours ago',
  },
  {
    id: '5',
    unread: false,
    icon: 'calendar',
    body: (
      <>
        <Text style={notifBodyStrongStyle}>Upcoming Event:</Text>
        <Text style={notifBodyRestStyle}> Regional Track Meet starts in 2 days</Text>
      </>
    ),
    time: '5 hours ago',
  },
  {
    id: '6',
    unread: false,
    avatar: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-9.jpg',
    body: (
      <>
        <Text style={notifBodyStrongStyle}>Jake Thompson</Text>
        <Text style={notifBodyRestStyle}>
          {' '}
          and <Text style={notifBodyStrongStyle}>12 others</Text> liked your training video
        </Text>
      </>
    ),
    time: 'Yesterday',
  },
  {
    id: '7',
    unread: false,
    avatar: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-6.jpg',
    body: (
      <>
        <Text style={notifBodyStrongStyle}>Lisa Park</Text>
        <Text style={notifBodyRestStyle}> replied to your comment</Text>
      </>
    ),
    time: '2 days ago',
  },
  {
    id: '8',
    unread: false,
    icon: 'trophy',
    body: (
      <>
        <Text style={notifBodyStrongStyle}>Achievement Unlocked:</Text>
        <Text style={notifBodyRestStyle}> Speed Demon — 10 sprint posts</Text>
      </>
    ),
    time: '3 days ago',
  },
];

type NotifRowUi = {
  id: string;
  unread: boolean;
  time: string;
  body: ReactNode;
  avatar?: string;
  icon?: 'calendar' | 'trophy';
};

export function NotificationsScreen({ navigation }: CProps<'Notifications'>) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());
  const [demoDismissed, setDemoDismissed] = useState(false);
  const [liveNotifs, setLiveNotifs] = useState<InAppNotification[] | null>(null);
  const showBanner = useActionBanner();

  const liveMode = isSupabaseConfigured();
  const isDemoUser = Boolean(user?.id.startsWith('demo-'));
  const useServerNotifs = liveMode && user && !isDemoUser;

  useEffect(() => {
    if (!useServerNotifs) {
      setLiveNotifs(null);
      return;
    }
    let cancelled = false;
    void listInAppNotifications(user.id).then((rows) => {
      if (!cancelled) setLiveNotifs(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [useServerNotifs, user]);

  const demoVisible: NotifRowUi[] = (demoDismissed ? [] : NOTIFICATION_ROWS).map((r) => ({
    id: r.id,
    unread: r.unread && !readIds.has(r.id),
    time: r.time,
    body: r.body,
    avatar: r.avatar,
    icon: r.icon,
  }));

  const serverVisible: NotifRowUi[] =
    liveNotifs?.map((n) => ({
      id: n.id,
      unread: !n.read_at,
      time: formatRelativePostTime(n.created_at),
      body: (
        <>
          <Text style={notifBodyStrongStyle}>{n.title}</Text>
          <Text style={notifBodyRestStyle}>{n.body ? ` ${n.body}` : ''}</Text>
        </>
      ),
      icon: 'calendar' as const,
    })) ?? [];

  const visible: NotifRowUi[] =
    useServerNotifs && liveNotifs !== null ? serverVisible : useServerNotifs && liveNotifs === null ? [] : demoVisible;

  const notificationsLoading = useServerNotifs && liveNotifs === null;
  const showNotificationsEmpty = !notificationsLoading && visible.length === 0;

  const markAllRead = useCallback(() => {
    if (useServerNotifs && user) {
      void markAllInAppNotificationsRead(user.id).then((ok) => {
        if (ok) {
          showBanner('Marked all read');
          void listInAppNotifications(user.id).then(setLiveNotifs);
        } else showBanner('Could not update', 'Check your connection.');
      });
      return;
    }
    setReadIds(new Set(NOTIFICATION_ROWS.map((r) => r.id)));
    showBanner('Marked all read');
  }, [useServerNotifs, user, showBanner]);

  const clearAll = useCallback(() => {
    if (useServerNotifs && user) {
      void clearInAppNotifications(user.id).then((ok) => {
        if (ok) {
          showBanner('Notifications cleared');
          void listInAppNotifications(user.id).then(setLiveNotifs);
        } else showBanner('Could not clear', 'Check delete policy and connection.');
      });
      return;
    }
    setDemoDismissed(true);
    setReadIds(new Set());
    showBanner('Notifications cleared');
  }, [useServerNotifs, user, showBanner]);

  const onPressRow = useCallback(
    (row: NotifRowUi) => {
      if (useServerNotifs && user) {
        void markInAppNotificationRead(user.id, row.id).then((ok) => {
          if (ok) {
            setLiveNotifs((prev) =>
              prev
                ? prev.map((n) => (n.id === row.id ? { ...n, read_at: new Date().toISOString() } : n))
                : prev,
            );
          }
        });
        return;
      }
      setReadIds((prev) => new Set(prev).add(row.id));
    },
    [useServerNotifs, user],
  );

  return (
    <View style={styles.root}>
      <View style={[styles.notifHeader, { paddingTop: insets.top + DS.space.md }]}>
        <View style={styles.notifHeaderTop}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
            <FontAwesome name="arrow-left" size={20} color={DS.color.gold} />
          </Pressable>
          <Text style={styles.notifTitle}>NOTIFICATIONS</Text>
          <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={styles.notifClose}>
            <FontAwesome name="times" size={20} color={DS.color.textMuted} />
          </Pressable>
        </View>
        <View style={styles.notifHeaderActions}>
          <Pressable onPress={markAllRead} hitSlop={8}>
            <Text style={styles.markAllRead}>Mark all as read</Text>
          </Pressable>
          <Pressable onPress={clearAll} hitSlop={8}>
            <Text style={styles.notifClear}>Clear</Text>
          </Pressable>
        </View>
      </View>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {notificationsLoading ? (
          <ActivityIndicator color={DS.color.gold} style={{ marginTop: DS.space.lg }} />
        ) : null}
        {showNotificationsEmpty ? (
          <Text style={styles.feedEmptyText}>No new notifications</Text>
        ) : null}
        {visible.map((row) => (
          <Pressable
            key={row.id}
            style={[
              styles.notifItem,
              row.unread ? styles.notifItemUnread : styles.notifItemRead,
            ]}
            onPress={() => onPressRow(row)}
          >
            {row.avatar ? (
              <Image source={{ uri: row.avatar }} style={styles.notifAvatar} />
            ) : row.icon === 'calendar' ? (
              <View style={styles.notifIconCircle}>
                <FontAwesome name="calendar" size={16} color={DS.color.gold} />
              </View>
            ) : (
              <View style={styles.notifIconCircle}>
                <FontAwesome name="trophy" size={16} color={DS.color.gold} />
              </View>
            )}
            <View style={styles.notifTextCol}>
              <Text style={styles.notifBodyLine}>{row.body}</Text>
              <Text style={styles.notifTime}>{row.time}</Text>
            </View>
            {row.unread ? <View style={styles.notifUnreadDot} /> : null}
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

type InboxThread = {
  id: string;
  name: string;
  avatar: string;
  time: string;
  preview: string;
  previewMuted?: boolean;
  online?: boolean;
  unread?: number;
  selected?: boolean;
};

const INBOX_THREADS: InboxThread[] = [
  {
    id: '1',
    name: 'Coach Williams',
    avatar: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-8.jpg',
    time: '2m',
    preview: 'Great progress on your technique today! Keep it up 💪',
    online: true,
    unread: 3,
    selected: true,
  },
  {
    id: '2',
    name: 'Sarah Chen',
    avatar: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-5.jpg',
    time: '15m',
    preview: 'Thanks! See you at practice tomorrow 🏃‍♀️',
    online: true,
    previewMuted: true,
  },
  {
    id: '3',
    name: 'Marcus Johnson',
    avatar: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-2.jpg',
    time: '1h',
    preview: 'Did you see the new training schedule?',
    selected: true,
    unread: 1,
  },
  {
    id: '4',
    name: 'Emma Rodriguez',
    avatar: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-7.jpg',
    time: '3h',
    preview: "You: Perfect! I'll be there at 6 AM",
    online: true,
    previewMuted: true,
  },
  {
    id: '5',
    name: 'Jake Thompson',
    avatar: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-9.jpg',
    time: 'Yesterday',
    preview: 'You: Good luck at the meet this weekend!',
    previewMuted: true,
  },
  {
    id: '6',
    name: 'Lisa Park',
    avatar: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-6.jpg',
    time: 'Yesterday',
    preview: 'The warm-up routine really helped today',
    previewMuted: true,
  },
  {
    id: '7',
    name: 'David Martinez',
    avatar: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-3.jpg',
    time: '2 days ago',
    preview: 'Can you share that sprint drill video?',
    previewMuted: true,
  },
  {
    id: '8',
    name: 'Rachel Kim',
    avatar: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-1.jpg',
    time: '3 days ago',
    preview: "You: Sure! I'll send it over tonight",
    previewMuted: true,
  },
  {
    id: '9',
    name: 'Training Group',
    avatar: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-4.jpg',
    time: '1 week ago',
    preview: "Sarah: Don't forget Saturday's team workout!",
    previewMuted: true,
  },
];

type InboxRowUi = {
  id: string;
  name: string;
  avatar: string;
  time: string;
  preview: string;
  previewMuted?: boolean;
  online?: boolean;
  unread?: number;
  selected?: boolean;
  conversationId?: string;
  peerUserId?: string;
};

export function MessagesInboxScreen({ navigation }: CProps<'MessagesInbox'>) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const liveMsgs = Boolean(isSupabaseConfigured() && user && !user.id.startsWith('demo-'));
  const [liveThreads, setLiveThreads] = useState<ConversationSummary[]>([]);

  const reloadInboxThreads = useCallback(async () => {
    if (!liveMsgs || !user) {
      setLiveThreads([]);
      return;
    }
    const rows = await listConversationSummaries(user.id);
    setLiveThreads(rows);
  }, [liveMsgs, user]);

  useFocusEffect(
    useCallback(() => {
      void reloadInboxThreads();
    }, [reloadInboxThreads]),
  );

  const { refreshing, onRefresh } = useRefreshWithMinimum(reloadInboxThreads, 4000);

  const [filter, setFilter] = useState('');
  const newMessageDemo = useCallback(() => {
    Alert.alert(
      'New message',
      liveMsgs
        ? 'Demo threads below. To DM a real user: add a Supabase profile UUID (Settings → follow requests test peers), then we can wire a picker here.'
        : 'Try a recipient who limits DMs vs one you follow. Server-side RLS will mirror this with Supabase.',
      [
        {
          text: 'Marcus (not following)',
          onPress: () => {
            const gate = assertCanMessageRecipient({
              recipientPref: 'followers_only',
              isFollowingRecipient: false,
            });
            if (!gate.ok) {
              Alert.alert(
                'Cannot send',
                'This user does not accept messages from people they do not follow. Follow them first.',
              );
              return;
            }
            navigation.navigate('MessageThread', { name: 'Marcus Johnson' });
          },
        },
        {
          text: 'Coach (you follow)',
          onPress: () => {
            const gate = assertCanMessageRecipient({
              recipientPref: 'followers_only',
              isFollowingRecipient: true,
            });
            if (!gate.ok) return;
            navigation.navigate('MessageThread', { name: 'Coach Williams' });
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  }, [navigation, liveMsgs]);
  const threads = useMemo(() => {
    const liveRows: InboxRowUi[] = liveThreads.map((t) => ({
      id: `live-${t.conversation_id}`,
      name: t.peer_display_name?.trim() || 'Member',
      avatar: t.peer_avatar_url?.trim() ? t.peer_avatar_url : FEED_AVATAR_PLACEHOLDER,
      time: t.last_at ? formatRelativePostTime(t.last_at) : '',
      preview: t.last_body ?? 'No messages yet',
      previewMuted: !t.last_body,
      conversationId: t.conversation_id,
      peerUserId: t.peer_user_id,
    }));
    const demoRows: InboxRowUi[] = INBOX_THREADS.map((t) => ({
      id: t.id,
      name: t.name,
      avatar: t.avatar,
      time: t.time,
      preview: t.preview,
      previewMuted: t.previewMuted,
      online: t.online,
      unread: t.unread,
      selected: t.selected,
    }));
    const merged = [...liveRows, ...demoRows];
    const f = filter.trim().toLowerCase();
    if (!f) return merged;
    return merged.filter(
      (t) => t.name.toLowerCase().includes(f) || t.preview.toLowerCase().includes(f),
    );
  }, [filter, liveThreads]);
  return (
    <View style={styles.root}>
      <PullRefreshRiveOverlay visible={refreshing && liveMsgs} topInset={insets.top} />
      <View style={[styles.inboxHeader, { paddingTop: insets.top + DS.space.md }]}>
        <View style={styles.inboxHeaderRow}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
            <FontAwesome name="arrow-left" size={20} color={DS.color.gold} />
          </Pressable>
          <Text style={styles.inboxTitle}>MESSAGES</Text>
          <Pressable hitSlop={8} onPress={newMessageDemo}>
            <FontAwesome5 name="pen-square" size={18} color={DS.color.gold} solid />
          </Pressable>
        </View>
        <View style={styles.inboxSearchWrap}>
          <FontAwesome
            name="search"
            size={14}
            color={DS.color.textMuted}
            style={styles.inboxSearchIcon}
          />
          <TextInput
            style={styles.inboxSearchInput}
            placeholder="Search conversations..."
            placeholderTextColor={DS.color.textMuted}
            value={filter}
            onChangeText={setFilter}
          />
        </View>
      </View>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
        showsVerticalScrollIndicator={false}
        refreshControl={liveMsgs ? pullRefreshControl(refreshing, onRefresh) : undefined}
      >
        {threads.map((t) => (
          <Pressable
            key={t.id}
            style={[
              styles.inboxRow,
              t.selected ? styles.inboxRowSelected : styles.inboxRowIdle,
            ]}
            onPress={() =>
              navigation.navigate('MessageThread', {
                name: t.name,
                conversationId: t.conversationId,
                peerUserId: t.peerUserId,
                avatarUrl: t.avatar,
              })
            }
          >
            <View style={styles.inboxAvatarWrap}>
              <Image source={{ uri: t.avatar }} style={styles.inboxAvatar} />
              {t.online ? <View style={styles.inboxOnlineDot} /> : null}
            </View>
            <View style={styles.inboxMid}>
              <View style={styles.inboxNameRow}>
                <Text style={styles.inboxName} numberOfLines={1}>
                  {t.name}
                </Text>
                <Text style={styles.inboxTime}>{t.time}</Text>
              </View>
              <Text
                style={t.previewMuted ? styles.inboxPreviewMuted : styles.inboxPreview}
                numberOfLines={1}
              >
                {t.preview}
              </Text>
            </View>
            {t.unread ? (
              <View style={styles.inboxUnreadBadge}>
                <Text style={styles.inboxUnreadBadgeTxt}>{t.unread}</Text>
              </View>
            ) : null}
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const COACH_AVATAR =
  'https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-8.jpg';

const COACH_THREAD: { from: 'them' | 'me'; text: string; time: string; read?: 'double' | 'single' }[] = [
  {
    from: 'them',
    text: 'Hey! How did your morning run go? I saw you posted about trying the new route.',
    time: '9:15 AM',
  },
  {
    from: 'me',
    text: 'It was amazing! The hill sections were challenging but I felt strong. Thanks for suggesting it 🏃‍♂️',
    time: '9:18 AM',
    read: 'double',
  },
  {
    from: 'them',
    text: "That's what I like to hear! Your endurance has really improved over the past month.",
    time: '9:20 AM',
  },
  {
    from: 'them',
    text: 'Great progress on your technique today! Keep it up 💪',
    time: '2:45 PM',
  },
  {
    from: 'me',
    text: 'Thank you coach! I really felt the difference in my form today. The breathing exercises are helping a lot.',
    time: '2:47 PM',
    read: 'double',
  },
  {
    from: 'them',
    text: "Excellent! For tomorrow's session, let's focus on interval training. Are you ready for a challenge?",
    time: '2:50 PM',
  },
  {
    from: 'me',
    text: "Absolutely! I'm excited to push my limits. What time should I be there?",
    time: '2:52 PM',
    read: 'single',
  },
  {
    from: 'them',
    text: "6 AM sharp! And don't forget to bring your water bottle and towel.",
    time: 'Now',
  },
];

export function MessageThreadScreen({ navigation, route }: CProps<'MessageThread'>) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const showBanner = useActionBanner();
  const conversationIdParam = route.params?.conversationId;
  const peerUserId = route.params?.peerUserId;
  const title = route.params?.name ?? 'Coach Williams';
  const paramAvatar = route.params?.avatarUrl;
  const isCoachDemo = title === 'Coach Williams' && !conversationIdParam && !peerUserId;
  const avatar = paramAvatar?.trim()
    ? paramAvatar
    : isCoachDemo
      ? COACH_AVATAR
      : 'https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-5.jpg';

  const [liveMessages, setLiveMessages] = useState<MessageRow[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(Boolean(conversationIdParam || peerUserId));
  const [activeConversationId, setActiveConversationId] = useState<string | undefined>(
    conversationIdParam,
  );

  useEffect(() => {
    setActiveConversationId(conversationIdParam);
  }, [conversationIdParam]);

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        if (!user?.id || user.id.startsWith('demo-')) {
          setLiveMessages([]);
          setLoading(false);
          return;
        }
        if (conversationIdParam) {
          setLoading(true);
          const msgs = await listMessages(conversationIdParam, 100);
          setLiveMessages(msgs);
          setLoading(false);
          return;
        }
        if (peerUserId) {
          setLoading(true);
          const cid = await getOrCreateConversationId(peerUserId);
          if (cid) {
            setActiveConversationId(cid);
            const msgs = await listMessages(cid, 100);
            setLiveMessages(msgs);
          }
          setLoading(false);
        } else {
          setLiveMessages([]);
          setLoading(false);
        }
      })();
    }, [conversationIdParam, peerUserId, user]),
  );

  const cidFinal = activeConversationId ?? conversationIdParam;
  const isLive = Boolean(cidFinal && user && !user.id.startsWith('demo-'));

  useEffect(() => {
    if (!isLive || !cidFinal || !user) return;
    const supabase = getSupabase();
    if (!supabase) return;
    const channel = supabase
      .channel(`messages-${cidFinal}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${cidFinal}`,
        },
        (payload) => {
          const row = payload.new as MessageRow;
          if (!row?.id || row.sender_id === user.id) return;
          setLiveMessages((prev) => {
            if (prev.some((x) => x.id === row.id)) return prev;
            return [...prev, row];
          });
          const snippet = (row.body ?? '').trim().slice(0, 72);
          showBanner('New message', snippet || 'Open thread to read');
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [isLive, cidFinal, user, showBanner]);

  const send = useCallback(async () => {
    if (!cidFinal || !user || draft.trim().length === 0) return;
    const m = await sendTextMessage(cidFinal, user.id, draft);
    if (m) {
      setDraft('');
      setLiveMessages((prev) => [...prev, m]);
      showBanner('Sent', 'Message delivered.');
    } else {
      Alert.alert('Send failed', 'Check Supabase messaging RLS and rpc_get_or_create_dm.sql.');
    }
  }, [cidFinal, user, draft, showBanner]);

  const demoBubbles = isCoachDemo
    ? COACH_THREAD
    : [
        { from: 'them' as const, text: `Hey — chat with ${title} (demo).`, time: 'Now' },
        { from: 'me' as const, text: 'Sounds good!', time: 'Now', read: 'double' as const },
      ];

  const bubbles = isLive
    ? liveMessages.map((m) => ({
        from: (m.sender_id === user.id ? 'me' : 'them') as 'me' | 'them',
        text: m.body ?? '',
        time: formatRelativePostTime(m.created_at),
        read: (m.sender_id === user.id ? 'double' : undefined) as 'double' | 'single' | undefined,
      }))
    : demoBubbles;

  return (
    <View style={styles.root}>
      <View style={[styles.threadHeader, { paddingTop: insets.top + DS.space.md }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <FontAwesome name="arrow-left" size={20} color={DS.color.gold} />
        </Pressable>
        <Image source={{ uri: avatar }} style={styles.threadHeaderAvatar} />
        <View style={styles.threadHeaderMid}>
          <Text style={styles.threadHeaderName} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.threadHeaderStatus}>{isLive ? 'Messages' : 'Online'}</Text>
        </View>
        <View style={styles.threadHeaderActions}>
          <Pressable hitSlop={8} style={styles.threadHeaderIcon}>
            <FontAwesome name="phone" size={16} color={DS.color.gold} />
          </Pressable>
          <Pressable hitSlop={8} style={styles.threadHeaderIcon}>
            <FontAwesome name="video-camera" size={16} color={DS.color.gold} />
          </Pressable>
          <Pressable hitSlop={8} style={styles.threadHeaderIcon}>
            <FontAwesome name="user" size={18} color={DS.color.gold} />
          </Pressable>
          <Pressable hitSlop={8} style={styles.threadHeaderIcon}>
            <FontAwesome name="bell-slash" size={16} color={DS.color.gold} />
          </Pressable>
        </View>
      </View>
      <ScrollView
        contentContainerStyle={[styles.threadBody, { paddingBottom: DS.space.lg }]}
        showsVerticalScrollIndicator={false}
      >
        {loading && isLive ? (
          <ActivityIndicator color={DS.color.gold} style={{ marginVertical: 16 }} />
        ) : null}
        <View style={styles.threadDayPillWrap}>
          <Text style={styles.threadDayPill}>Today</Text>
        </View>
        {bubbles.map((m, i) =>
          m.from === 'them' ? (
            <View key={`${i}-t`} style={styles.threadMsgThem}>
              <View style={styles.bubbleThem}>
                <Text style={styles.bubbleText}>{m.text}</Text>
              </View>
              <Text style={styles.bubbleMetaThem}>{m.time}</Text>
            </View>
          ) : (
            <View key={`${i}-m`} style={styles.threadMsgMe}>
              <View style={styles.bubbleMe}>
                <Text style={styles.bubbleTextDark}>{m.text}</Text>
              </View>
              <View style={styles.bubbleMetaMeRow}>
                <Text style={styles.bubbleMetaMe}>{m.time}</Text>
                {m.read === 'double' ? (
                  <FontAwesome5 name="check-double" size={11} color={DS.color.gold} solid />
                ) : m.read === 'single' ? (
                  <FontAwesome name="check" size={11} color={DS.color.textMuted} />
                ) : null}
              </View>
            </View>
          ),
        )}
      </ScrollView>
      <View style={[styles.composeBar, { paddingBottom: Math.max(insets.bottom, DS.space.md) }]}>
        <Pressable hitSlop={8} style={styles.composePlus}>
          <FontAwesome name="plus" size={20} color={DS.color.gold} />
        </Pressable>
        <TextInput
          style={styles.composeInputRounded}
          placeholder="Type a message..."
          placeholderTextColor={DS.color.textMuted}
          multiline
          value={draft}
          onChangeText={setDraft}
          editable={isLive}
        />
        <Pressable
          style={[styles.sendBtnRound, !isLive || !draft.trim() ? { opacity: 0.45 } : null]}
          onPress={() => void send()}
          disabled={!isLive || !draft.trim()}
        >
          <FontAwesome5 name="paper-plane" size={16} color={DS.color.background} solid />
        </Pressable>
      </View>
    </View>
  );
}

const BRAND_VIDEO_THUMB =
  'https://storage.googleapis.com/uxpilot-auth.appspot.com/91bf71e10a-f9bb386c642433b2804a.png';
const BRAND_PRODUCTS: { uri: string; title: string; price: string }[] = [
  {
    uri: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/13a32f8919-e32e3b4c0c51f38c043e.png',
    title: 'Pro Percussion V2',
    price: '$299.00',
  },
  {
    uri: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/a6dc2597c3-e8765beb7b2c7040a874.png',
    title: 'Recovery Boots',
    price: '$899.00',
  },
  {
    uri: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/32a6819a9b-b47ac4c88b9be5998210.png',
    title: 'Density Roller',
    price: '$45.00',
  },
];

export function BrandPartnerScreen({ navigation }: BrandPartnerScreenProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.root}>
      <View style={[styles.brandTopNav, { paddingTop: insets.top + DS.space.sm }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.brandNavBtn}>
          <FontAwesome name="chevron-left" size={18} color={DS.color.textMuted} />
        </Pressable>
        <Text style={styles.brandNavTitle}>Partner</Text>
        <View style={styles.brandNavBtn} />
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.brandScroll,
          { paddingBottom: 120 + insets.bottom },
        ]}
      >
        <View style={styles.brandHero}>
          <View style={styles.brandLogoCard}>
            <BrandLogo width={240} height={72} />
          </View>
          <Text style={styles.brandHeroTitle}>ATHLETIC X</Text>
          <View style={styles.brandActiveRow}>
            <View style={styles.brandActiveDot} />
            <Text style={styles.brandActiveLabel}>Active Partner</Text>
          </View>
        </View>
        <View style={styles.brandQuoteSection}>
          <FontAwesome name="quote-left" size={20} color={DS.color.gold} style={{ opacity: 0.5 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.brandQuoteKicker}>DALTON SAYS</Text>
            <Text style={styles.brandQuoteBody}>
              &quot;These guys provide the best recovery gear I&apos;ve ever used. It&apos;s
              fundamentally changed how I approach my post-training routine.&quot;
            </Text>
          </View>
        </View>
        <View style={styles.brandPromoBlock}>
          <View style={styles.brandPromoHeadingRow}>
            <FontAwesome name="star" size={10} color={DS.color.gold} />
            <Text style={styles.brandPromoHeading}> Member Exclusive</Text>
          </View>
          <View style={styles.brandCodeRow}>
            <View style={styles.brandCodeBox}>
              <Text style={styles.brandCodeText}>PRO-LEVEL-20</Text>
              <Pressable
                style={styles.brandCopyBtn}
                onPress={() => Alert.alert('Copied', 'PRO-LEVEL-20')}
              >
                <FontAwesome name="copy" size={14} color={DS.color.gold} />
              </Pressable>
            </View>
          </View>
          <Text style={styles.brandCodeHint}>
            Tap to copy your exclusive 20% off discount code
          </Text>
        </View>
        <View style={styles.brandAbout}>
          <Text style={styles.brandAboutTitle}>About Athletic X</Text>
          <Text style={styles.brandAboutBody}>
            Athletic X engineers premium recovery tools designed for elite performers. By combining
            cutting-edge material science with biomechanical insights, they deliver solutions that
            accelerate recovery and optimize peak physical performance.
          </Text>
          <View style={styles.brandTagRow}>
            {['Recovery', 'Gear', 'Performance'].map((tag) => (
              <View key={tag} style={styles.brandTag}>
                <Text style={styles.brandTagText}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>
        <Pressable style={styles.brandFeaturedVideo}>
          <Image source={{ uri: BRAND_VIDEO_THUMB }} style={styles.brandVideoImg} />
          <View style={styles.brandVideoScrim} />
          <View style={styles.brandPlayCircle}>
            <FontAwesome name="play" size={18} color={DS.color.gold} style={{ marginLeft: 4 }} />
          </View>
          <View style={styles.brandDurationBadge}>
            <Text style={styles.brandDurationText}>02:45</Text>
          </View>
        </Pressable>
        <View style={styles.brandProductsHeader}>
          <Text style={styles.brandProductsTitle}>Featured Gear</Text>
          <Text style={styles.brandViewAll}>View All</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.brandProductsScroll}
        >
          {BRAND_PRODUCTS.map((p) => (
            <View key={p.title} style={styles.brandProductCard}>
              <View style={styles.brandProductThumb}>
                <Image source={{ uri: p.uri }} style={styles.brandProductImg} resizeMode="contain" />
              </View>
              <Text style={styles.brandProductTitle} numberOfLines={1}>
                {p.title}
              </Text>
              <Text style={styles.brandProductPrice}>{p.price}</Text>
            </View>
          ))}
        </ScrollView>
      </ScrollView>
      <View style={[styles.brandFooter, { paddingBottom: Math.max(insets.bottom, DS.space.md) }]}>
        <Pressable style={styles.brandVisitCta}>
          <Text style={styles.brandVisitText}>VISIT WEBSITE</Text>
          <FontAwesome5 name="external-link-alt" size={13} color={DS.color.gold} solid />
        </Pressable>
      </View>
    </View>
  );
}

export function DemoHubScreen({ navigation }: CProps<'DemoHub'>) {
  const { logout } = useAuth();
  const go = (tab: 'Community' | 'Media' | 'Events' | 'Sponsors' | 'Profile', screen: string) => {
    navigation.getParent()?.navigate(tab, { screen });
  };
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.hubPad}>
      <Text style={styles.hubKicker}>DALTON PROJECT</Text>
      <Text style={styles.hubTitle}>MOBILE DEMO FLOWS</Text>
      <Text style={styles.hubBody}>
        Jump into the same paths as index.html — native React Native screens.
      </Text>
      <HubBtn label="Path A — Sign out → auth / welcome" onPress={() => void logout()} />
      <HubBtn label="Path B — Upcoming events" onPress={() => go('Events', 'UpcomingEvents')} />
      <HubBtn label="Path C — Media library" onPress={() => go('Media', 'MediaLibrary')} />
      <HubBtn label="Path D — Community feed" onPress={() => go('Community', 'CommunityFeed')} />
      <HubBtn label="Path E — Athlete profile" onPress={() => go('Profile', 'AthleteProfile')} />
      <Pressable style={styles.hubClose} onPress={() => navigation.goBack()}>
        <Text style={styles.muted}>Close</Text>
      </Pressable>
    </ScrollView>
  );
}

function HubBtn({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.hubBtn} onPress={onPress}>
      <Text style={styles.hubBtnText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: DS.color.background,
  },
  feedHeader: {
    paddingHorizontal: DS.space.base,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DS.color.borderWhite5,
  },
  feedHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: DS.space.md,
  },
  communityTitle: {
    ...tabRootTitleText,
  },
  feedHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.space.lg,
  },
  communityFab: {
    position: 'absolute',
    right: DS.space.base,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: DS.color.gold,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.45)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 8,
  },
  createTop: {
    paddingHorizontal: DS.space.base,
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DS.color.borderWhite5,
    paddingBottom: DS.space.md,
  },
  createTitle: {
    flex: 1,
    fontFamily: DS.font.heading,
    fontSize: 14,
    letterSpacing: 2,
    color: DS.color.gold,
    textAlign: 'center',
  },
  createPostBtn: {
    backgroundColor: DS.color.gold,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  createPostBtnTxt: {
    fontFamily: DS.font.bodyMedium,
    color: DS.color.background,
    fontWeight: '700',
  },
  createBody: {
    padding: DS.space.base,
    gap: DS.space.base,
  },
  mediaActionsRow: {
    flexDirection: 'row',
    gap: DS.space.sm,
  },
  createCarousel: {
    gap: DS.space.base,
  },
  createMediaCard: {
    width: 320,
    height: 380,
    borderRadius: DS.radius.xl,
    overflow: 'hidden',
    backgroundColor: DS.color.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: DS.color.borderWhite5,
    marginRight: DS.space.base,
  },
  createMedia: {
    width: '100%',
    height: '100%',
  },
  mediaRemove: {
    position: 'absolute',
    zIndex: 2,
    top: DS.space.sm,
    right: DS.space.sm,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createEmptyMedia: {
    borderRadius: DS.radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: DS.color.borderWhite5,
    padding: DS.space.lg,
    backgroundColor: DS.color.surface,
  },
  createEmptyMediaTxt: {
    fontFamily: DS.font.body,
    color: DS.color.textMuted,
  },
  composerSectionKicker: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 11,
    letterSpacing: 1.2,
    color: DS.color.textMuted,
    marginBottom: DS.space.sm,
  },
  composerHero: {
    width: '100%',
    aspectRatio: 4 / 5,
    borderRadius: DS.radius.xl,
    overflow: 'hidden',
    backgroundColor: DS.color.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: DS.color.borderWhite5,
    position: 'relative',
  },
  composerHeroInner: {
    width: '100%',
    height: '100%',
  },
  composerHeroEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: DS.space.xl,
    gap: DS.space.sm,
  },
  composerHeroEmptyTitle: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 17,
    color: DS.color.text,
    textAlign: 'center',
  },
  composerHeroEmptySub: {
    fontFamily: DS.font.body,
    fontSize: 13,
    color: DS.color.textMuted,
    textAlign: 'center',
  },
  composerAddChip: {
    position: 'absolute',
    bottom: DS.space.sm,
    right: DS.space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: DS.radius.pill,
    backgroundColor: DS.color.gold,
  },
  composerAddChipTxt: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 11,
    color: DS.color.background,
  },
  composerThumbStrip: {
    flexDirection: 'row',
    gap: DS.space.sm,
    paddingVertical: DS.space.xs,
  },
  composerThumbWrap: {
    width: 62,
    height: 62,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: DS.color.borderWhite5,
    position: 'relative',
    backgroundColor: DS.color.surface,
  },
  composerThumb: {
    width: '100%',
    height: '100%',
  },
  composerThumbRemove: {
    position: 'absolute',
    top: 2,
    right: 2,
    zIndex: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.62)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerThumbVidBadge: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    padding: 3,
  },
  captionCard: {
    backgroundColor: DS.color.surface,
    borderRadius: DS.radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: DS.color.borderWhite5,
    padding: DS.space.md,
  },
  captionInput: {
    fontFamily: DS.font.body,
    fontSize: 15,
    lineHeight: 22,
    color: DS.color.text,
    minHeight: 90,
    textAlignVertical: 'top',
  },
  eventTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.space.sm,
    paddingVertical: DS.space.md,
    paddingHorizontal: DS.space.md,
    borderRadius: DS.radius.xl,
    backgroundColor: DS.color.surfaceAlt,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: DS.color.borderWhite5,
  },
  eventTagTxt: {
    flex: 1,
    fontFamily: DS.font.bodyMedium,
    color: DS.color.text,
  },
  eventPickerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  eventPickerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  eventPickerSheet: {
    backgroundColor: DS.color.background,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: DS.space.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: DS.color.borderWhite5,
    maxHeight: '70%',
  },
  eventPickerTitle: {
    fontFamily: DS.font.heading,
    color: DS.color.gold,
    fontSize: 16,
    letterSpacing: 1,
    marginBottom: DS.space.md,
  },
  eventPickerRow: {
    paddingVertical: DS.space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DS.color.borderWhite5,
  },
  eventPickerRowTitle: {
    fontFamily: DS.font.bodyMedium,
    color: DS.color.text,
    fontSize: 15,
  },
  eventPickerRowMeta: {
    fontFamily: DS.font.body,
    color: DS.color.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  notifDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: DS.color.error,
    borderWidth: 2,
    borderColor: DS.color.background,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: DS.space.md,
    paddingBottom: DS.space.md,
  },
  chip: {
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 12,
  },
  chipOn: {
    borderColor: DS.color.gold,
    backgroundColor: DS.color.goldTint10,
  },
  chipOff: {
    borderColor: DS.color.border,
  },
  chipTextOn: {
    fontFamily: DS.font.bodyMedium,
    color: DS.color.gold,
    fontSize: 14,
    fontWeight: '600',
  },
  chipTextOff: {
    fontFamily: DS.font.bodyMedium,
    color: DS.color.textMuted,
    fontSize: 14,
  },
  feedList: {
    padding: DS.space.base,
    gap: DS.space.base,
  },
  feedBanner: {
    backgroundColor: DS.color.goldTint10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: DS.color.postBorderGold20,
    padding: DS.space.md,
    marginBottom: DS.space.base,
  },
  feedBannerText: {
    fontFamily: DS.font.body,
    fontSize: 13,
    lineHeight: 20,
    color: DS.color.text,
  },
  feedEmptyText: {
    fontFamily: DS.font.body,
    fontSize: 14,
    color: DS.color.textMuted,
    textAlign: 'center',
    marginVertical: DS.space.lg,
  },
  feedSampleKicker: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 12,
    letterSpacing: 0.8,
    color: DS.color.gold,
    textAlign: 'center',
    marginBottom: DS.space.base,
    textTransform: 'uppercase',
  },
  composerWrap: {
    backgroundColor: DS.color.surface,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: DS.color.postBorderGold20,
    padding: DS.space.md,
    marginBottom: DS.space.base,
  },
  composerInput: {
    fontFamily: DS.font.body,
    fontSize: 15,
    lineHeight: 22,
    color: DS.color.text,
    minHeight: 72,
    textAlignVertical: 'top',
  },
  composerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: DS.space.sm,
  },
  attachActions: {
    flexDirection: 'row',
    gap: DS.space.sm,
    marginTop: DS.space.sm,
  },
  attachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: DS.color.borderWhite5,
    backgroundColor: DS.color.surfaceAlt,
  },
  attachBtnTxt: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 12,
    color: DS.color.text,
  },
  attachRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: DS.space.sm,
    marginTop: DS.space.sm,
  },
  attachChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.space.sm,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: DS.color.borderWhite5,
    backgroundColor: DS.color.surfaceAlt,
    maxWidth: '100%',
  },
  attachThumb: { width: 22, height: 22, borderRadius: 6 },
  attachIcon: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: DS.color.goldTint10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachName: {
    fontFamily: DS.font.body,
    fontSize: 12,
    color: DS.color.text,
    maxWidth: 160,
  },
  postButton: {
    backgroundColor: DS.color.gold,
    paddingHorizontal: DS.space.lg,
    paddingVertical: DS.space.sm,
    borderRadius: 8,
  },
  postButtonDisabled: {
    opacity: 0.45,
  },
  postButtonText: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 14,
    fontWeight: '600',
    color: DS.color.background,
  },
  postCard: {
    backgroundColor: DS.color.surface,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: DS.color.postBorderGold20,
    padding: DS.space.base,
    marginBottom: DS.space.base,
  },
  postTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: DS.space.md,
  },
  postAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: DS.space.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: DS.color.borderWhite5,
  },
  postMetaCol: {
    flex: 1,
  },
  postName: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 15,
    color: DS.color.text,
  },
  postTime: {
    fontFamily: DS.font.body,
    fontSize: 11,
    fontWeight: '300',
    color: DS.color.textMuted,
    marginTop: 2,
  },
  postMore: {
    marginLeft: DS.space.sm,
  },
  badge: {
    backgroundColor: DS.color.goldTint10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: DS.space.sm,
  },
  badgeText: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 10,
    fontWeight: '700',
    color: DS.color.gold,
  },
  postBodyBlock: {
    gap: DS.space.sm,
    marginBottom: 0,
  },
  postBody: {
    fontFamily: DS.font.body,
    fontSize: 14,
    lineHeight: 22,
    color: DS.color.text,
  },
  mentionGold: {
    color: DS.color.gold,
    fontFamily: DS.font.bodyMedium,
    fontWeight: '600',
  },
  clapEmoji: {
    fontSize: 13,
    lineHeight: 16,
  },
  postImage: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: DS.radius.lg,
    marginTop: DS.space.sm,
  },
  postCarouselWrap: {
    width: '100%',
    marginTop: DS.space.sm,
    borderRadius: DS.radius.lg,
    overflow: 'hidden',
  },
  postCarouselItem: {
    aspectRatio: 16 / 9,
    backgroundColor: DS.color.surfaceAlt,
  },
  postCarouselMedia: {
    width: '100%',
    height: '100%',
  },
  postActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: DS.space.sm,
    paddingTop: DS.space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: DS.color.borderWhite5,
  },
  postActionsLeft: {
    flexDirection: 'row',
    gap: DS.space.md,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionTxt: {
    fontSize: 12,
    color: DS.color.textMuted,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: DS.space.base,
    gap: DS.space.md,
  },
  iconBtn: {
    padding: DS.space.sm,
  },
  searchInput: {
    flex: 1,
    backgroundColor: DS.color.input,
    borderRadius: DS.radius.lg,
    paddingHorizontal: DS.space.base,
    paddingVertical: DS.space.md,
    color: DS.color.text,
    fontSize: 16,
  },
  searchCta: {
    padding: DS.space.lg,
  },
  commSearchBody: {
    paddingHorizontal: DS.space.base,
    paddingTop: DS.space.base,
  },
  commSearchSectionTitle: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 14,
    color: DS.color.text,
    marginBottom: DS.space.md,
    marginTop: DS.space.md,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: DS.space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DS.color.borderWhite5,
  },
  recentRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.space.md,
    flex: 1,
  },
  recentRowText: {
    fontFamily: DS.font.body,
    fontSize: 14,
    color: DS.color.text,
  },
  suggestedTagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: DS.space.sm,
    marginBottom: DS.space.md,
  },
  suggestedTag: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: DS.color.border,
  },
  suggestedTagOn: {
    borderColor: DS.color.gold,
    backgroundColor: DS.color.goldTint10,
  },
  suggestedTagTxt: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 14,
    color: DS.color.textMuted,
  },
  suggestedTagTxtOn: {
    color: DS.color.gold,
  },
  trendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.space.md,
    paddingVertical: DS.space.sm,
  },
  trendingTopic: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 14,
    color: DS.color.text,
  },
  trendingMeta: {
    fontFamily: DS.font.body,
    fontSize: 12,
    color: DS.color.textMuted,
    marginTop: 2,
  },
  commSearchCta: {
    marginTop: DS.space.xl,
    backgroundColor: DS.color.goldTint10,
    borderWidth: 1,
    borderColor: DS.color.gold,
    paddingVertical: DS.space.md,
    borderRadius: DS.radius.lg,
    alignItems: 'center',
  },
  commSearchCtaText: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 16,
    color: DS.color.gold,
  },
  searchHeaderWrap: {
    paddingHorizontal: DS.space.base,
    paddingBottom: DS.space.md,
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DS.color.surface,
    borderRadius: DS.radius.lg,
    borderWidth: 1,
    borderColor: DS.color.border,
    paddingLeft: 36,
    paddingRight: DS.space.md,
    minHeight: 48,
  },
  searchInputIcon: {
    position: 'absolute',
    left: DS.space.base,
    zIndex: 1,
  },
  searchInputInner: {
    flex: 1,
    fontFamily: DS.font.body,
    fontSize: 14,
    color: DS.color.text,
    paddingVertical: DS.space.md,
  },
  searchResultsHeader: {
    paddingHorizontal: DS.space.base,
    paddingBottom: DS.space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DS.color.borderWhite5,
  },
  searchResultsTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.space.sm,
    marginBottom: DS.space.md,
  },
  searchResultsInputText: {
    flex: 1,
    fontFamily: DS.font.body,
    fontSize: 14,
    color: DS.color.text,
    paddingVertical: 10,
  },
  searchClearHit: {
    padding: DS.space.sm,
  },
  searchBellDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: DS.color.gold,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.space.sm,
    marginBottom: DS.space.md,
  },
  sortLabel: {
    fontFamily: DS.font.body,
    fontSize: 14,
    color: DS.color.textMuted,
  },
  sortChipsInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.space.sm,
    paddingRight: DS.space.lg,
  },
  sortChip: {
    paddingHorizontal: DS.space.sm,
    paddingVertical: 6,
    borderRadius: DS.radius.sm,
    borderWidth: 1,
    borderColor: DS.color.border,
    backgroundColor: DS.color.surface,
  },
  sortChipOn: {
    borderColor: DS.color.gold,
  },
  sortChipTextOn: {
    fontSize: 13,
    color: DS.color.text,
    fontFamily: DS.font.bodyMedium,
  },
  sortChipTextOff: {
    fontSize: 13,
    color: DS.color.textMuted,
    fontFamily: DS.font.body,
  },
  searchFilterChipsRow: {
    flexDirection: 'row',
    gap: DS.space.sm,
    paddingBottom: DS.space.sm,
  },
  searchFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: DS.radius.pill,
    borderWidth: 1,
    borderColor: DS.color.border,
  },
  searchFilterChipOn: {
    borderColor: DS.color.gold,
    backgroundColor: DS.color.goldTint10,
  },
  searchFilterChipTextOn: {
    fontSize: 12,
    color: DS.color.gold,
    fontFamily: DS.font.bodyMedium,
    fontWeight: '600',
  },
  searchFilterChipTextOff: {
    fontSize: 12,
    color: DS.color.textMuted,
    fontFamily: DS.font.bodyMedium,
  },
  searchResultsList: {
    padding: DS.space.base,
  },
  searchResultCount: {
    fontFamily: DS.font.body,
    fontSize: 14,
    color: DS.color.textMuted,
    marginBottom: DS.space.base,
  },
  searchResultCard: {
    backgroundColor: DS.color.surface,
    borderRadius: DS.radius.xl,
    padding: DS.space.base,
    marginBottom: DS.space.base,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: DS.color.borderWhite5,
  },
  searchResultCardTop: {
    flexDirection: 'row',
    gap: DS.space.md,
    marginBottom: DS.space.md,
  },
  searchResultAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  searchResultNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  searchResultName: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 14,
    color: DS.color.text,
  },
  searchResultDot: {
    fontSize: 12,
    color: DS.color.textMuted,
  },
  searchResultTime: {
    fontFamily: DS.font.body,
    fontSize: 12,
    color: DS.color.textMuted,
  },
  resultPostBody: {
    fontFamily: DS.font.body,
    fontSize: 14,
    lineHeight: 22,
    color: DS.color.text,
  },
  resultHighlight: {
    color: DS.color.gold,
    fontFamily: DS.font.bodyMedium,
    fontWeight: '600',
  },
  searchResultMedia: {
    borderRadius: DS.radius.lg,
    overflow: 'hidden',
    marginBottom: DS.space.md,
    backgroundColor: DS.color.background,
    position: 'relative',
  },
  searchResultMediaImg: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  searchResultPlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  searchResultActions: {
    flexDirection: 'row',
    gap: DS.space.base,
    alignItems: 'center',
  },
  searchResultAction: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchResultActionTxt: {
    fontSize: 13,
    color: DS.color.textMuted,
    fontFamily: DS.font.body,
  },
  notifHeader: {
    paddingHorizontal: DS.space.base,
    paddingBottom: DS.space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DS.color.borderWhite5,
  },
  notifHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: DS.space.md,
  },
  notifTitle: {
    ...tabRootTitleText,
    flex: 1,
    textAlign: 'center',
  },
  notifClose: {
    width: 40,
    alignItems: 'flex-end',
  },
  notifHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  markAllRead: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 14,
    color: DS.color.gold,
  },
  notifClear: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 14,
    color: DS.color.gold,
    fontWeight: '600',
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: DS.space.md,
    padding: DS.space.base,
    borderLeftWidth: 2,
  },
  notifItemUnread: {
    backgroundColor: 'rgba(28, 28, 28, 0.5)',
    borderLeftColor: DS.color.gold,
  },
  notifItemRead: {
    borderLeftColor: 'transparent',
  },
  notifAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  notifIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: DS.color.goldTint10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifTextCol: {
    flex: 1,
    minWidth: 0,
  },
  notifBodyLine: {
    fontFamily: DS.font.body,
    fontSize: 14,
    lineHeight: 22,
    color: DS.color.text,
  },
  notifTime: {
    fontFamily: DS.font.body,
    fontSize: 12,
    color: DS.color.textMuted,
    marginTop: 4,
  },
  notifUnreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: DS.color.gold,
    marginTop: 8,
  },
  inboxHeader: {
    paddingHorizontal: DS.space.base,
    paddingBottom: DS.space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DS.color.borderWhite5,
  },
  inboxHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: DS.space.md,
  },
  inboxTitle: {
    ...tabRootTitleText,
    flex: 1,
    textAlign: 'center',
  },
  inboxSearchWrap: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DS.color.surface,
    borderRadius: DS.radius.lg,
    borderWidth: 1,
    borderColor: DS.color.border,
    paddingLeft: 36,
    minHeight: 48,
  },
  inboxSearchIcon: {
    position: 'absolute',
    left: DS.space.base,
  },
  inboxSearchInput: {
    flex: 1,
    fontFamily: DS.font.body,
    fontSize: 14,
    color: DS.color.text,
    paddingVertical: DS.space.md,
    paddingRight: DS.space.base,
  },
  inboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: DS.space.md,
    padding: DS.space.base,
    borderLeftWidth: 2,
  },
  inboxRowSelected: {
    backgroundColor: 'rgba(28, 28, 28, 0.2)',
    borderLeftColor: DS.color.gold,
  },
  inboxRowIdle: {
    borderLeftColor: 'transparent',
  },
  inboxAvatarWrap: {
    position: 'relative',
  },
  inboxAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  inboxOnlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: DS.color.onlineGreen,
    borderWidth: 2,
    borderColor: DS.color.background,
  },
  inboxMid: {
    flex: 1,
    minWidth: 0,
  },
  inboxNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  inboxName: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 14,
    color: DS.color.text,
    flex: 1,
    marginRight: DS.space.sm,
  },
  inboxTime: {
    fontSize: 12,
    color: DS.color.textMuted,
  },
  inboxPreview: {
    fontFamily: DS.font.body,
    fontSize: 14,
    color: DS.color.text,
  },
  inboxPreviewMuted: {
    fontFamily: DS.font.body,
    fontSize: 14,
    color: DS.color.textMuted,
  },
  inboxUnreadBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: DS.color.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  inboxUnreadBadgeTxt: {
    fontSize: 11,
    fontFamily: DS.font.bodyBold,
    color: DS.color.background,
  },
  threadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: DS.space.base,
    paddingBottom: DS.space.md,
    gap: DS.space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DS.color.borderWhite5,
  },
  threadHeaderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  threadHeaderMid: {
    flex: 1,
    minWidth: 0,
    marginRight: DS.space.xs,
  },
  threadHeaderName: {
    fontFamily: DS.font.heading,
    fontSize: 22,
    color: DS.color.text,
    letterSpacing: 1,
  },
  threadHeaderStatus: {
    fontFamily: DS.font.body,
    fontSize: 12,
    color: DS.color.onlineGreen,
  },
  threadHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flexShrink: 0,
  },
  threadHeaderIcon: {
    padding: DS.space.sm,
  },
  threadDayPillWrap: {
    alignItems: 'center',
    marginBottom: DS.space.md,
  },
  threadDayPill: {
    fontFamily: DS.font.body,
    fontSize: 12,
    color: DS.color.textMuted,
    backgroundColor: DS.color.surface,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: DS.radius.pill,
    overflow: 'hidden',
  },
  threadMsgThem: {
    alignSelf: 'flex-start',
    maxWidth: 280,
    marginBottom: DS.space.md,
  },
  threadMsgMe: {
    alignSelf: 'flex-end',
    maxWidth: 280,
    marginBottom: DS.space.md,
  },
  bubbleMetaThem: {
    fontFamily: DS.font.body,
    fontSize: 12,
    color: DS.color.textMuted,
    marginLeft: DS.space.sm,
    marginTop: 4,
  },
  bubbleMetaMeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  bubbleMetaMe: {
    fontFamily: DS.font.body,
    fontSize: 12,
    color: DS.color.textMuted,
  },
  composeBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: DS.space.base,
    paddingTop: DS.space.md,
    gap: DS.space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: DS.color.borderWhite5,
    backgroundColor: DS.color.background,
  },
  composePlus: {
    padding: DS.space.sm,
    marginBottom: 4,
  },
  composeInputRounded: {
    flex: 1,
    backgroundColor: DS.color.surface,
    borderRadius: DS.radius.xl,
    borderWidth: 1,
    borderColor: DS.color.border,
    paddingHorizontal: DS.space.base,
    paddingVertical: DS.space.md,
    fontFamily: DS.font.body,
    fontSize: 14,
    color: DS.color.text,
    maxHeight: 120,
  },
  sendBtnRound: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: DS.color.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  brandTopNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: DS.space.base,
    paddingBottom: DS.space.md,
    backgroundColor: DS.color.surfaceFloating92,
    borderBottomWidth: 1,
    borderBottomColor: DS.color.surface,
  },
  brandNavBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  brandNavTitle: {
    ...tabRootTitleText,
    flex: 1,
    textAlign: 'center',
  },
  brandScroll: {
    paddingHorizontal: DS.space.base,
  },
  brandHero: {
    alignItems: 'center',
    paddingTop: DS.space.lg,
    paddingBottom: DS.space.xl,
  },
  brandLogoCard: {
    width: '100%',
    backgroundColor: DS.color.surface,
    borderRadius: 10,
    padding: DS.space.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: DS.space.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: DS.color.borderWhite5,
  },
  brandHeroTitle: {
    fontFamily: DS.font.heading,
    fontSize: 36,
    color: DS.color.text,
    letterSpacing: 2,
    marginBottom: DS.space.sm,
  },
  brandActiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.space.sm,
  },
  brandActiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: DS.color.onlineGreen,
  },
  brandActiveLabel: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 12,
    color: DS.color.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  brandQuoteSection: {
    flexDirection: 'row',
    gap: DS.space.base,
    paddingVertical: DS.space.lg,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: DS.color.surface,
  },
  brandQuoteKicker: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 11,
    color: DS.color.gold,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: DS.space.sm,
  },
  brandQuoteBody: {
    fontFamily: DS.font.body,
    fontSize: 14,
    fontStyle: 'italic',
    fontWeight: '300',
    color: DS.color.textMuted,
    lineHeight: 22,
  },
  brandPromoBlock: {
    paddingVertical: DS.space.xl,
    alignItems: 'center',
  },
  brandPromoHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: DS.space.base,
  },
  brandPromoHeading: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 12,
    color: DS.color.gold,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  brandCodeRow: {
    width: '100%',
    maxWidth: 280,
    marginTop: DS.space.sm,
  },
  brandCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: DS.color.gold,
    borderRadius: DS.radius.md,
    backgroundColor: 'rgba(10, 10, 10, 0.8)',
    padding: DS.space.base,
  },
  brandCodeText: {
    flex: 1,
    fontFamily: DS.font.bodyBold,
    fontSize: 16,
    color: DS.color.gold,
    letterSpacing: 4,
    textAlign: 'center',
  },
  brandCopyBtn: {
    width: 32,
    height: 32,
    borderRadius: DS.radius.sm,
    backgroundColor: DS.color.goldTint10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandCodeHint: {
    fontFamily: DS.font.body,
    fontSize: 11,
    color: DS.color.textMuted,
    textAlign: 'center',
    marginTop: DS.space.md,
    paddingHorizontal: DS.space.lg,
  },
  brandAbout: {
    paddingVertical: DS.space.lg,
  },
  brandAboutTitle: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 14,
    color: DS.color.text,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: DS.space.md,
  },
  brandAboutBody: {
    fontFamily: DS.font.body,
    fontSize: 14,
    color: DS.color.textMuted,
    lineHeight: 22,
    marginBottom: DS.space.md,
  },
  brandTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: DS.space.sm,
  },
  brandTag: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: DS.radius.pill,
    backgroundColor: DS.color.surface,
  },
  brandTagText: {
    fontFamily: DS.font.body,
    fontSize: 11,
    color: DS.color.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  brandFeaturedVideo: {
    marginVertical: DS.space.lg,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: DS.color.surface,
    position: 'relative',
  },
  brandVideoImg: {
    width: '100%',
    aspectRatio: 16 / 9,
    opacity: 0.6,
  },
  brandVideoScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  brandPlayCircle: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -28,
    marginTop: -28,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(10,10,10,0.8)',
    borderWidth: 1,
    borderColor: DS.color.goldTint30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandDurationBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: 'rgba(10,10,10,0.8)',
    paddingHorizontal: DS.space.sm,
    paddingVertical: 4,
    borderRadius: DS.radius.sm,
  },
  brandDurationText: {
    fontFamily: DS.font.bodyBold,
    fontSize: 10,
    color: DS.color.text,
  },
  brandProductsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: DS.space.md,
  },
  brandProductsTitle: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 14,
    color: DS.color.text,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  brandViewAll: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 11,
    color: DS.color.gold,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  brandProductsScroll: {
    gap: DS.space.base,
    paddingBottom: DS.space.lg,
  },
  brandProductCard: {
    width: 140,
  },
  brandProductThumb: {
    aspectRatio: 1,
    backgroundColor: DS.color.surface,
    borderRadius: DS.radius.lg,
    marginBottom: DS.space.sm,
    padding: DS.space.base,
    borderWidth: 1,
    borderColor: DS.color.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandProductImg: {
    width: '100%',
    height: '100%',
  },
  brandProductTitle: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 13,
    color: DS.color.text,
  },
  brandProductPrice: {
    fontFamily: DS.font.body,
    fontSize: 12,
    color: DS.color.textMuted,
    marginTop: 4,
  },
  brandFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: DS.space.base,
    paddingTop: DS.space.md,
    backgroundColor: DS.color.surfaceFloating92,
    borderTopWidth: 1,
    borderTopColor: DS.color.surface,
  },
  brandVisitCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: DS.space.md,
    paddingVertical: DS.space.base,
    borderWidth: 1,
    borderColor: DS.color.gold,
    backgroundColor: 'rgba(10,10,10,0.5)',
    borderRadius: 2,
  },
  brandVisitText: {
    fontFamily: DS.font.heading,
    fontSize: 14,
    color: DS.color.gold,
    letterSpacing: 2,
    marginTop: 2,
  },
  simpleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: DS.space.lg,
    paddingVertical: DS.space.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DS.color.borderHairline,
  },
  simpleTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: DS.color.text,
    flex: 1,
    textAlign: 'center',
  },
  padded: {
    padding: DS.space.lg,
  },
  muted: {
    color: DS.color.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  gold: {
    color: DS.color.gold,
    fontWeight: '600',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.space.md,
    paddingVertical: DS.space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DS.color.borderHairline,
  },
  resultAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  notifRow: {
    flexDirection: 'row',
    gap: DS.space.md,
    paddingVertical: DS.space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DS.color.borderHairline,
  },
  notifDotLg: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: DS.color.gold,
    marginTop: 6,
  },
  threadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.space.md,
    paddingVertical: DS.space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DS.color.borderHairline,
  },
  threadAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: DS.color.input,
  },
  threadTime: {
    fontSize: 12,
    color: DS.color.textMuted,
  },
  threadBody: {
    padding: DS.space.lg,
    gap: DS.space.sm,
  },
  bubbleThem: {
    backgroundColor: DS.color.surface,
    paddingHorizontal: DS.space.base,
    paddingVertical: DS.space.md,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    borderBottomLeftRadius: 6,
  },
  bubbleMe: {
    backgroundColor: DS.color.gold,
    paddingHorizontal: DS.space.base,
    paddingVertical: DS.space.md,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 6,
  },
  bubbleText: {
    color: DS.color.text,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: DS.font.body,
  },
  bubbleTextDark: {
    color: DS.color.background,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: DS.font.body,
  },
  composeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: DS.space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: DS.color.borderHairline,
    gap: DS.space.sm,
  },
  composeInput: {
    flex: 1,
    backgroundColor: DS.color.input,
    borderRadius: DS.radius.pill,
    paddingHorizontal: DS.space.base,
    paddingVertical: DS.space.sm,
    color: DS.color.text,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: DS.color.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: DS.space.lg,
  },
  heroBrand: {
    fontSize: 32,
    fontWeight: '700',
    color: DS.color.gold,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: DS.space.sm,
  },
  card: {
    marginTop: DS.space.xl,
    padding: DS.space.lg,
    backgroundColor: DS.color.surface,
    borderRadius: DS.radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: DS.color.cardBorder,
  },
  primaryMini: {
    marginTop: DS.space.lg,
    backgroundColor: DS.color.gold,
    paddingVertical: DS.space.md,
    borderRadius: DS.radius.lg,
    alignItems: 'center',
  },
  primaryMiniText: {
    color: DS.color.background,
    fontWeight: '700',
  },
  hubPad: {
    padding: DS.space.lg,
    paddingBottom: 48,
  },
  hubKicker: {
    fontSize: 12,
    letterSpacing: 3,
    color: DS.color.gold,
    marginBottom: DS.space.sm,
  },
  hubTitle: {
    ...tabRootTitleText,
    marginBottom: DS.space.md,
  },
  hubBody: {
    color: DS.color.textMuted,
    marginBottom: DS.space.xl,
    lineHeight: 22,
  },
  hubBtn: {
    backgroundColor: DS.color.gold,
    paddingVertical: DS.space.md,
    borderRadius: DS.radius.xl,
    alignItems: 'center',
    marginBottom: DS.space.md,
  },
  hubBtnText: {
    color: DS.color.background,
    fontWeight: '700',
    fontSize: 14,
  },
  hubClose: {
    alignItems: 'center',
    marginTop: DS.space.lg,
  },
});
