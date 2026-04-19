import { useCallback, useMemo, useState, type ReactNode } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FontAwesome, FontAwesome5 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthContext';
import { BrandLogo } from '../components/BrandLogo';
import { DS, tabRootTitleText } from '../designSystem';
import { assertCanMessageRecipient } from '../messaging/messagingPolicy';
import type { CommunityStackParamList, SponsorsStackParamList } from '../navigation/types';

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
const IMG_HIGH =
  'https://images.unsplash.com/photo-1552674605-15c2145e9ca3?q=80&w=800&auto=format&fit=crop';

export function CommunityFeedScreen({ navigation }: CProps<'CommunityFeed'>) {
  const insets = useSafeAreaInsets();
  const [chip, setChip] = useState(0);
  return (
    <View style={styles.root}>
      <View style={[styles.feedHeader, { paddingTop: insets.top + DS.space.md }]}>
        <View style={styles.feedHeaderRow}>
          <Text style={styles.communityTitle}>COMMUNITY</Text>
          <View style={styles.feedHeaderActions}>
            <Pressable onPress={() => navigation.navigate('CommunitySearch')}>
              <FontAwesome name="search" size={20} color={DS.color.gold} />
            </Pressable>
            <Pressable onPress={() => navigation.navigate('Notifications')}>
              <View>
                <FontAwesome name="bell-o" size={22} color={DS.color.gold} />
                <View style={styles.notifDot} />
              </View>
            </Pressable>
            <Pressable onPress={() => navigation.navigate('MessagesInbox')}>
              <FontAwesome5 name="paper-plane" size={18} color={DS.color.gold} solid={false} />
            </Pressable>
          </View>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {FILTERS.map((f, i) => (
            <Pressable
              key={f}
              onPress={() => setChip(i)}
              style={[styles.chip, chip === i ? styles.chipOn : styles.chipOff]}
            >
              <Text style={chip === i ? styles.chipTextOn : styles.chipTextOff}>{f}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      <ScrollView
        contentContainerStyle={[styles.feedList, { paddingBottom: 100 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <PostCard
          postId="p1"
          avatar="https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-2.jpg"
          name="Marcus Johnson"
          time="2 hours ago"
          body="Great session today! Shaved 0.2s off my 100m sprint time. The new block start technique from Coach Davis is really paying off. 🏃🏾‍♂️💨"
          likes={24}
          heartFilled={false}
          secondary={{ kind: 'fire', count: 12 }}
          comments={5}
        />
        <PostCard
          postId="p2"
          avatar="https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-5.jpg"
          name="Sarah Chen"
          time="5 hours ago"
          body="Form check from this morning's high jump practice. Clearing 1.75m consistently now!"
          imageUri={IMG_HIGH}
          likes={89}
          heartFilled
          secondary={{ kind: 'clap', count: 15 }}
          comments={12}
        />
        <PostCard
          postId="p3"
          avatar="https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-8.jpg"
          name="Coach Williams"
          time="Yesterday"
          badge="MENTOR"
          bodyParagraphs={[
            'Nutrition tip for recovery days: 🥦🥩',
            "Many young athletes underestimate the importance of protein intake on their rest days. Your muscles are rebuilding during this time, not while you're training.",
            "Aim for 1.6-2.0g of protein per kg of body weight. Break it down into 4-5 meals throughout the day rather than one massive steak at dinner. Stay hydrated and don't skip those complex carbs!",
          ]}
          likes={142}
          heartFilled={false}
          secondary={{ kind: 'lightbulb', count: 38 }}
          comments={24}
          onPressCard={() => navigation.navigate('BrandPartner')}
        />
      </ScrollView>
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
  likes: number;
  heartFilled?: boolean;
  secondary?: SecondaryReaction;
  comments: number;
  badge?: string;
  onPressCard?: () => void;
}) {
  const [liked, setLiked] = useState(!!initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikes);
  const [secondary, setSecondary] = useState<SecondaryReaction | undefined>(initialSecondary);
  const [commentCount, setCommentCount] = useState(initialCommentCount);

  const bodyText = useMemo(
    () => (bodyParagraphs ? bodyParagraphs.join('\n\n') : body ?? ''),
    [body, bodyParagraphs],
  );

  const bodySection =
    bodyParagraphs ? (
      <View style={styles.postBodyBlock}>
        {bodyParagraphs.map((p, i) => (
          <Text key={i} style={styles.postBody}>
            {p}
          </Text>
        ))}
      </View>
    ) : (
      <Text style={styles.postBody}>{body}</Text>
    );

  const toggleLike = useCallback(() => {
    setLiked((v) => {
      setLikeCount((c) => (v ? c - 1 : c + 1));
      return !v;
    });
  }, []);

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
  }, [initialSecondary]);

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
      'Thread view will load from Supabase (`post_comments`) when the backend is wired. You can still demo the counter locally.',
      [
        { text: 'Add demo comment', onPress: () => setCommentCount((c) => c + 1) },
        { text: 'OK', style: 'cancel' },
      ],
    );
  }, []);

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
          {imageUri ? <Image source={{ uri: imageUri }} style={styles.postImage} /> : null}
        </Pressable>
      ) : (
        <>
          {bodySection}
          {imageUri ? <Image source={{ uri: imageUri }} style={styles.postImage} /> : null}
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
  const [tagChip, setTagChip] = useState(0);
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
        <Text style={styles.commSearchSectionTitle}>Suggested Tags</Text>
        <View style={styles.suggestedTagsWrap}>
          {FILTERS.map((f, i) => (
            <Pressable
              key={f}
              onPress={() => {
                setTagChip(i);
                runSearch(f === 'All' ? 'sprint technique' : f);
              }}
              style={[styles.suggestedTag, tagChip === i && styles.suggestedTagOn]}
            >
              <Text style={[styles.suggestedTagTxt, tagChip === i && styles.suggestedTagTxtOn]}>
                {f}
              </Text>
            </Pressable>
          ))}
        </View>
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
        <Pressable style={styles.commSearchCta} onPress={() => runSearch(q)}>
          <Text style={styles.commSearchCtaText}>Search</Text>
        </Pressable>
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

export function NotificationsScreen({ navigation }: CProps<'Notifications'>) {
  const insets = useSafeAreaInsets();
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());
  const visible = NOTIFICATION_ROWS.map((r) => ({
    ...r,
    unread: r.unread && !readIds.has(r.id),
  }));
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
        <Pressable
          onPress={() => setReadIds(new Set(NOTIFICATION_ROWS.map((r) => r.id)))}
          hitSlop={8}
        >
          <Text style={styles.markAllRead}>Mark all as read</Text>
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {visible.map((row) => (
          <Pressable
            key={row.id}
            style={[
              styles.notifItem,
              row.unread ? styles.notifItemUnread : styles.notifItemRead,
            ]}
            onPress={() => setReadIds((prev) => new Set(prev).add(row.id))}
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
              <Text style={styles.notifBodyLine}>
                {row.body}
              </Text>
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

export function MessagesInboxScreen({ navigation }: CProps<'MessagesInbox'>) {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState('');
  const newMessageDemo = useCallback(() => {
    Alert.alert(
      'New message',
      'Try a recipient who limits DMs vs one you follow. Server-side RLS will mirror this with Supabase.',
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
  }, [navigation]);
  const threads = useMemo(() => {
    const f = filter.trim().toLowerCase();
    if (!f) return INBOX_THREADS;
    return INBOX_THREADS.filter(
      (t) =>
        t.name.toLowerCase().includes(f) || t.preview.toLowerCase().includes(f),
    );
  }, [filter]);
  return (
    <View style={styles.root}>
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
      >
        {threads.map((t) => (
          <Pressable
            key={t.id}
            style={[
              styles.inboxRow,
              t.selected ? styles.inboxRowSelected : styles.inboxRowIdle,
            ]}
            onPress={() => navigation.navigate('MessageThread', { name: t.name })}
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
  const title = route.params?.name ?? 'Coach Williams';
  const isCoach = title === 'Coach Williams';
  const avatar = isCoach ? COACH_AVATAR : 'https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-5.jpg';
  const bubbles = isCoach
    ? COACH_THREAD
    : [
        { from: 'them' as const, text: `Hey — chat with ${title} (demo).`, time: 'Now' },
        { from: 'me' as const, text: 'Sounds good!', time: 'Now', read: 'double' as const },
      ];
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
          <Text style={styles.threadHeaderStatus}>Online</Text>
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
        />
        <Pressable style={styles.sendBtnRound}>
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
  markAllRead: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 14,
    color: DS.color.gold,
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
