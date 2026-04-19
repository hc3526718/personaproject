import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FontAwesome } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthContext';
import { syncDaltonVerifiedFromProfileIfPremium } from '../auth/userMetadataSupabase';
import { AppleHeroButton } from '../components/AppleHeroButton';
import { BrandLogo } from '../components/BrandLogo';
import { ScreenHeader } from '../components/ScreenHeader';
import { DS } from '../designSystem';
import { isSupabaseConfigured } from '../lib/env';
import { getSupabase } from '../lib/supabase';
import type { ProfileStackParamList } from '../navigation/types';
import { useSubscription } from '../subscriptions/SubscriptionContext';

type PProps<K extends keyof ProfileStackParamList> = NativeStackScreenProps<ProfileStackParamList, K>;
type SectionDetailRoute = RouteProp<ProfileStackParamList, 'EditProfileSectionDetail'>;

const AV =
  'https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-2.jpg';
const HL_THUMB =
  'https://storage.googleapis.com/uxpilot-auth.appspot.com/31c2b75d62-cdb79732e3d7fcb5be97.png';

const RECENT_RESULTS = [
  { meet: 'National State Finals', where: 'Austin, TX • Mar 2024', time: '10.42s' },
  { meet: 'Regional Open', where: 'Houston, TX • Feb 2024', time: '10.51s' },
  { meet: 'Indoor Championships', where: 'Chicago, IL • Jan 2024', time: '6.72s (60m)' },
] as const;

export function AthleteProfileScreen({ navigation }: PProps<'AthleteProfile'>) {
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
  return (
    <View style={styles.root}>
      <View style={[styles.profileTop, { paddingTop: insets.top + DS.space.md }]}>
        <Pressable
          style={styles.iconRound}
          onPress={() => navigation.navigate('Settings')}
        >
          <FontAwesome name="cog" size={20} color={DS.color.textMuted} />
        </Pressable>
        <View style={styles.profileTopSpacer} />
      </View>
      <ScrollView
        contentContainerStyle={[styles.profileScroll, { paddingBottom: 100 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.avatarWrap}>
          <Image source={{ uri: AV }} style={styles.avatar} />
        </View>
        <Text style={styles.profileName}>MARCUS STROMAN</Text>
        <View style={styles.tagRow}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>Sprinter</Text>
          </View>
          <View style={styles.tag}>
            <Text style={styles.tagText}>Pro Level</Text>
          </View>
        </View>
        <View style={styles.statsCard}>
          {[
            ['24', 'PBs'],
            ['120', 'EVENTS'],
            ['89', 'ENDORSED'],
          ].map(([b, a]) => (
            <View key={a} style={styles.statCell}>
              <Text style={styles.statVal}>{b}</Text>
              <Text style={styles.statLabel}>{a}</Text>
            </View>
          ))}
        </View>
        <Pressable style={styles.endorseBanner}>
          <FontAwesome name="certificate" size={18} color={DS.color.background} />
          <Text style={styles.endorseBannerText}> Endorsed by Dalton</Text>
        </Pressable>
        <View style={styles.highlightsHeader}>
          <Text style={styles.sectionTitleKicker}>HIGHLIGHTS</Text>
          <Pressable onPress={() => navigation.navigate('EditProfileSections')}>
            <Text style={styles.viewAllGold}>View all</Text>
          </Pressable>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.highlightsScroll}
        >
          {[1, 2, 3].map((i) => (
            <Pressable key={i} style={styles.highlightCard}>
              <Image source={{ uri: HL_THUMB }} style={styles.highlightThumb} />
              <View style={styles.highlightPlay}>
                <FontAwesome name="play" size={14} color={DS.color.background} />
              </View>
            </Pressable>
          ))}
        </ScrollView>
        <Text style={styles.sectionTitleKicker}>RECENT RESULTS</Text>
        {RECENT_RESULTS.map((r) => (
          <View key={r.meet} style={styles.resultCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.resultMeet}>{r.meet}</Text>
              <Text style={styles.resultWhere}>{r.where}</Text>
            </View>
            <View style={styles.pbPill}>
              <Text style={styles.pbPillText}>PB</Text>
              <Text style={styles.pbTime}>{r.time}</Text>
            </View>
          </View>
        ))}
        <Text style={styles.sectionTitle}>Bio</Text>
        <Text style={styles.muted}>
          U20 sprinter focused on 100m / 200m. Training with Grant Access cohort.
        </Text>
        <Text style={styles.devSectionLabel}>Developer</Text>
        <Pressable
          style={styles.menuRow}
          onPress={() =>
            navigation.getParent()?.navigate('Community', { screen: 'DemoHub' })
          }
        >
          <FontAwesome name="th-large" size={18} color={DS.color.gold} />
          <Text style={styles.menuText}>Demo flows hub</Text>
          <FontAwesome name="chevron-right" size={14} color={DS.color.textMuted} />
        </Pressable>
        <Pressable style={styles.menuRow} onPress={() => void logout()}>
          <FontAwesome name="sign-out" size={18} color={DS.color.gold} />
          <Text style={styles.menuText}>Sign out (demo — returns to welcome)</Text>
          <FontAwesome name="chevron-right" size={14} color={DS.color.textMuted} />
        </Pressable>
      </ScrollView>
    </View>
  );
}

export function SettingsScreen({ navigation }: PProps<'Settings'>) {
  const { logout, user } = useAuth();
  const { isPro } = useSubscription();

  useFocusEffect(
    useCallback(() => {
      if (!isSupabaseConfigured()) return;
      const s = getSupabase();
      if (!s) return;
      void syncDaltonVerifiedFromProfileIfPremium(s, isPro);
    }, [isPro]),
  );

  const premiumRow = {
    title: 'Premium',
    sub: 'Subscriptions, restore purchases, entitlements',
    icon: 'star' as const,
    onPress: () => navigation.navigate('Paywall'),
  };
  const adminRow =
    user && user.role !== 'member'
      ? [
          {
            title: 'Admin tools',
            sub: 'Moderation, events, check-in, analytics',
            icon: 'shield' as const,
            onPress: () => navigation.navigate('AdminTools'),
          },
        ]
      : [];
  const rows = [
    premiumRow,
    ...adminRow,
    {
      title: 'Account & Security',
      sub: 'Password, 2FA, login methods',
      icon: 'lock' as const,
      onPress: () => navigation.navigate('AccountSecurity'),
    },
    {
      title: 'Edit Profile Sections',
      sub: 'Name, bio, links, visibility',
      icon: 'list-ul' as const,
      onPress: () => navigation.navigate('EditProfileSections'),
    },
    {
      title: 'Privacy & Visibility',
      sub: 'Who can see your profile',
      icon: 'eye' as const,
      onPress: () => navigation.navigate('PrivacyVisibility'),
    },
    {
      title: 'Notifications',
      sub: 'Push and email preferences',
      icon: 'bell' as const,
      onPress: () => navigation.navigate('NotificationPrefs'),
    },
    {
      title: 'Support',
      sub: 'Help center and contact',
      icon: 'life-ring' as const,
      onPress: () => navigation.navigate('Support'),
    },
    {
      title: 'Legal',
      sub: 'Terms and privacy policy',
      icon: 'file-text-o' as const,
      onPress: () => navigation.navigate('Legal'),
    },
  ];
  return (
    <View style={styles.root}>
      <ScreenHeader title="Settings" onBack={() => navigation.goBack()} largeTitle />
      <ScrollView contentContainerStyle={styles.padded}>
        <View style={styles.settingsLogoRow}>
          <BrandLogo width={72} height={72} />
        </View>
        {user ? (
          <View style={styles.accountStatusCard}>
            <Text style={styles.accountStatusLabel}>Account</Text>
            <Text style={styles.accountStatusEmail}>{user.email || 'Signed in'}</Text>
            <Text
              style={[
                styles.accountVerifyBadge,
                user.daltonVerified ? styles.accountVerifyOn : styles.accountVerifyOff,
              ]}
            >
              {user.daltonVerified ? 'Dalton verified' : 'Not Dalton verified'}
            </Text>
            {!user.daltonVerified ? (
              <Text style={styles.accountStatusHint}>
                After Dalton approves your account and Premium is active, this switches to Dalton
                verified automatically.
              </Text>
            ) : null}
          </View>
        ) : null}
        {rows.map((r) => (
          <Pressable key={r.title} style={styles.settingsCard} onPress={r.onPress}>
            <View style={styles.settingsIcon}>
              <FontAwesome name={r.icon} size={16} color={DS.color.gold} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingsTitle}>{r.title}</Text>
              <Text style={styles.settingsSub}>{r.sub}</Text>
            </View>
            <FontAwesome name="chevron-right" size={14} color={DS.color.textMuted} />
          </Pressable>
        ))}
        <Pressable style={styles.logOutBtn} onPress={() => void logout()}>
          <FontAwesome name="sign-out" size={16} color={DS.color.background} />
          <Text style={styles.logOutBtnText}> Log Out</Text>
        </Pressable>
        <Pressable
          style={styles.deleteAccountWrap}
          onPress={() =>
            Alert.alert(
              'Delete account',
              'This is a static demo — no account will be removed.',
              [{ text: 'OK' }],
            )
          }
        >
          <Text style={styles.deleteAccountTxt}>Delete Account</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const SPORT_OPTIONS = [
  'Basketball',
  'Football',
  'Soccer',
  'Baseball',
  'Tennis',
  'Golf',
  'Track & Field',
  'Swimming',
  'Volleyball',
  'Hockey',
  'Other',
] as const;

const BIO_MAX = 200;

export function EditBasicScreen({ navigation }: PProps<'EditBasic'>) {
  const insets = useSafeAreaInsets();
  const [displayName, setDisplayName] = useState('Jordan Smith');
  const [username, setUsername] = useState('jordansmith23');
  const [bio, setBio] = useState(
    'Professional basketball player | Nike Athlete | Championship mindset 🏆',
  );
  const [location, setLocation] = useState('Los Angeles, CA');
  const [sport, setSport] = useState<string>('Basketball');
  const [sportOpen, setSportOpen] = useState(false);
  const [toast, setToast] = useState(false);
  const [errors, setErrors] = useState<{ displayName?: string; username?: string }>({});

  const bioLen = Math.min(bio.length, BIO_MAX);

  const clearFieldError = (key: 'displayName' | 'username') => {
    setErrors((e) => {
      const next = { ...e };
      delete next[key];
      return next;
    });
  };

  const onSave = () => {
    const next: typeof errors = {};
    if (!displayName.trim()) next.displayName = 'Display name is required';
    if (!username.trim()) next.username = 'Username is required';
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setToast(true);
  };

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(false), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <View style={styles.root}>
      <ScreenHeader title="Edit Basic Info" onBack={() => navigation.goBack()} largeTitle />
      {toast ? (
        <View style={[styles.editToast, { top: insets.top + 72 }]} pointerEvents="none">
          <FontAwesome name="check-circle" size={18} color={DS.color.white} />
          <Text style={styles.editToastText}> Profile updated successfully!</Text>
        </View>
      ) : null}
      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView
          contentContainerStyle={[styles.padded, { paddingBottom: 32 + insets.bottom }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.label, styles.editFirstLabel]}>
            Display Name <Text style={styles.reqStar}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, errors.displayName ? styles.inputError : null]}
            placeholder="Enter your display name"
            placeholderTextColor={DS.color.textMuted}
            value={displayName}
            onChangeText={(t) => {
              setDisplayName(t);
              clearFieldError('displayName');
            }}
          />
          {errors.displayName ? <Text style={styles.fieldError}>{errors.displayName}</Text> : null}

          <Text style={[styles.label, styles.labelSpaced]}>
            Username/Handle <Text style={styles.reqStar}>*</Text>
          </Text>
          <View style={styles.handleRow}>
            <Text style={styles.handleAt}>@</Text>
            <TextInput
              style={[styles.input, styles.inputHandle, errors.username ? styles.inputError : null]}
              placeholder="username"
              placeholderTextColor={DS.color.textMuted}
              value={username}
              autoCapitalize="none"
              onChangeText={(t) => {
                setUsername(t);
                clearFieldError('username');
              }}
            />
          </View>
          {errors.username ? <Text style={styles.fieldError}>{errors.username}</Text> : null}

          <Text style={[styles.label, styles.labelSpaced]}>Bio</Text>
          <TextInput
            style={[styles.input, styles.inputBio]}
            placeholder="Tell us about yourself..."
            placeholderTextColor={DS.color.textMuted}
            value={bio}
            multiline
            maxLength={BIO_MAX}
            textAlignVertical="top"
            onChangeText={setBio}
          />
          <Text style={styles.bioCount}>
            {bioLen}/{BIO_MAX} characters
          </Text>

          <Text style={[styles.label, styles.labelSpaced]}>Location</Text>
          <View style={styles.locationRow}>
            <FontAwesome name="map-marker" size={16} color={DS.color.textMuted} style={styles.locationIcon} />
            <TextInput
              style={[styles.input, styles.inputLocation]}
              placeholder="City, State/Country"
              placeholderTextColor={DS.color.textMuted}
              value={location}
              onChangeText={setLocation}
            />
          </View>

          <Text style={[styles.label, styles.labelSpaced]}>
            Primary Sport/Role <Text style={styles.reqStar}>*</Text>
          </Text>
          <Pressable style={styles.sportTrigger} onPress={() => setSportOpen(true)}>
            <Text style={styles.sportTriggerText}>{sport}</Text>
            <FontAwesome name="chevron-down" size={14} color={DS.color.textMuted} />
          </Pressable>

          <AppleHeroButton style={styles.saveBtnSpaced} onPress={onSave}>
            Save changes
          </AppleHeroButton>
          <Pressable style={styles.cancelBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={sportOpen} transparent animationType="fade" onRequestClose={() => setSportOpen(false)}>
        <View style={styles.sportModalRoot}>
          <Pressable style={styles.editModalBackdrop} onPress={() => setSportOpen(false)} />
          <View style={styles.sportModalSheet}>
            <Text style={styles.sportModalTitle}>Primary sport</Text>
            <ScrollView style={styles.sportModalList} keyboardShouldPersistTaps="handled">
              {SPORT_OPTIONS.map((opt) => (
                <Pressable
                  key={opt}
                  style={styles.sportModalRow}
                  onPress={() => {
                    setSport(opt);
                    setSportOpen(false);
                  }}
                >
                  <Text style={[styles.sportModalRowText, sport === opt && styles.sportModalRowTextOn]}>
                    {opt}
                  </Text>
                  {sport === opt ? <FontAwesome name="check" size={16} color={DS.color.gold} /> : null}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const PHOTO_EDIT_URI =
  'https://storage.googleapis.com/uxpilot-auth.appspot.com/df8a5c75f5-a5ff671efc349b235853.png';

const ATHLETE_LEVELS = [
  'Beginner',
  'Amateur',
  'Semi-Professional',
  'Professional',
  'Elite',
  'Olympic',
] as const;

const HEADLINE_BADGES = [
  { id: 'national-record', label: 'National Record', icon: 'trophy' as const },
  { id: 'olympic-qualifier', label: 'Olympic Qualifier', icon: 'certificate' as const },
  { id: 'world-champion', label: 'World Champion', icon: 'star' as const },
  { id: 'rising-star', label: 'Rising Star', icon: 'star-o' as const },
  { id: 'veteran', label: 'Veteran', icon: 'shield' as const },
  { id: 'team-captain', label: 'Team Captain', icon: 'users' as const },
];

export function EditProfilePhotoScreen({ navigation }: PProps<'EditProfilePhoto'>) {
  const insets = useSafeAreaInsets();
  const [cropMode, setCropMode] = useState(false);
  const [toast, setToast] = useState(false);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(false), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <View style={styles.root}>
      <ScreenHeader title="Edit Profile Photo" onBack={() => navigation.goBack()} largeTitle />
      {toast ? (
        <View style={[styles.editToast, { top: insets.top + 72 }]} pointerEvents="none">
          <FontAwesome name="check-circle" size={18} color={DS.color.white} />
          <Text style={styles.editToastText}> Profile photo updated!</Text>
        </View>
      ) : null}
      <ScrollView
        contentContainerStyle={[styles.padded, { paddingBottom: 32 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.photoHero}>
          <View style={styles.photoGoldRing}>
            <View style={styles.photoInnerCircle}>
              <Image source={{ uri: PHOTO_EDIT_URI }} style={styles.photoInnerImg} />
              {cropMode ? <View style={styles.photoCropOverlay} pointerEvents="none" /> : null}
            </View>
          </View>
          <Pressable style={styles.photoCameraFab}>
            <FontAwesome name="camera" size={16} color={DS.color.background} />
          </Pressable>
        </View>
        <Text style={styles.photoHintTitle}>Current profile photo</Text>
        <Text style={styles.photoHintSub}>Recommended: Square image, at least 400×400px</Text>

        <Pressable style={styles.photoActionRow}>
          <FontAwesome name="upload" size={18} color={DS.color.gold} />
          <Text style={styles.photoActionLabel}>Upload New Photo</Text>
        </Pressable>
        <Pressable style={styles.photoActionRow}>
          <FontAwesome name="picture-o" size={18} color={DS.color.gold} />
          <Text style={styles.photoActionLabel}>Choose from Gallery</Text>
        </Pressable>
        <Pressable
          style={[styles.photoActionRow, cropMode && styles.photoActionRowActive]}
          onPress={() => setCropMode((c) => !c)}
        >
          <FontAwesome name="expand" size={18} color={DS.color.gold} />
          <Text style={styles.photoActionLabel}>{cropMode ? 'Apply Crop' : 'Crop Photo'}</Text>
        </Pressable>
        <Pressable style={styles.photoRemoveRow}>
          <FontAwesome name="trash" size={18} color={DS.color.error} />
          <Text style={styles.photoRemoveLabel}>Remove Photo</Text>
        </Pressable>

        <AppleHeroButton style={styles.saveBtnSpaced} onPress={() => setToast(true)}>
          Save changes
        </AppleHeroButton>
        <Pressable style={styles.cancelBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

export function EditAthleteScreen({ navigation }: PProps<'EditAthlete'>) {
  const insets = useSafeAreaInsets();
  const [discipline, setDiscipline] = useState('Sprinter');
  const [level, setLevel] = useState<(typeof ATHLETE_LEVELS)[number]>('Professional');
  const [team, setTeam] = useState('Elite Track Club');
  const [coach, setCoach] = useState('Sarah Mitchell');
  const [badges, setBadges] = useState<Record<string, boolean>>({ 'olympic-qualifier': true });
  const [levelOpen, setLevelOpen] = useState(false);
  const [toast, setToast] = useState(false);
  const [discErr, setDiscErr] = useState('');

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(false), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const toggleBadge = (id: string) =>
    setBadges((b) => ({ ...b, [id]: !b[id] }));

  const onSave = () => {
    if (!discipline.trim()) {
      setDiscErr('Discipline is required');
      return;
    }
    setDiscErr('');
    setToast(true);
  };

  return (
    <View style={styles.root}>
      <ScreenHeader title="Edit Athlete Details" onBack={() => navigation.goBack()} largeTitle />
      {toast ? (
        <View style={[styles.editToast, { top: insets.top + 72 }]} pointerEvents="none">
          <FontAwesome name="check-circle" size={18} color={DS.color.white} />
          <Text style={styles.editToastText}> Athlete details saved!</Text>
        </View>
      ) : null}
      <ScrollView
        contentContainerStyle={[styles.padded, { paddingBottom: 32 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.athleteLabel}>
          Discipline <Text style={styles.reqStar}>*</Text>
        </Text>
        <TextInput
          style={[styles.input, discErr ? styles.inputError : null]}
          placeholder="e.g., Sprinter, Marathon Runner, Swimmer"
          placeholderTextColor={DS.color.textMuted}
          value={discipline}
          onChangeText={(t) => {
            setDiscipline(t);
            if (t.trim()) setDiscErr('');
          }}
        />
        <Text style={styles.athleteHint}>Your primary athletic discipline</Text>
        {discErr ? <Text style={styles.fieldError}>{discErr}</Text> : null}

        <Text style={[styles.athleteLabel, styles.labelSpaced]}>
          Competition Level <Text style={styles.reqStar}>*</Text>
        </Text>
        <Pressable style={styles.sportTrigger} onPress={() => setLevelOpen(true)}>
          <Text style={styles.sportTriggerText}>{level}</Text>
          <FontAwesome name="chevron-down" size={14} color={DS.color.textMuted} />
        </Pressable>

        <Text style={[styles.athleteLabel, styles.labelSpaced]}>Team/Club</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your team or club name"
          placeholderTextColor={DS.color.textMuted}
          value={team}
          onChangeText={setTeam}
        />
        <Text style={styles.athleteHint}>Current team or athletic club affiliation</Text>

        <Text style={[styles.athleteLabel, styles.labelSpaced]}>Coach (Optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your coach's name"
          placeholderTextColor={DS.color.textMuted}
          value={coach}
          onChangeText={setCoach}
        />
        <Text style={styles.athleteHint}>Your primary coach or trainer</Text>

        <Text style={[styles.athleteLabel, styles.labelSpaced]}>Headline Badges</Text>
        <Text style={styles.athleteHintSpaced}>Select badges to highlight your achievements</Text>
        <View style={styles.badgeGrid}>
          {HEADLINE_BADGES.map((b) => (
            <Pressable
              key={b.id}
              style={[styles.badgeCell, badges[b.id] ? styles.badgeCellOn : null]}
              onPress={() => toggleBadge(b.id)}
            >
              <FontAwesome name={b.icon} size={14} color={DS.color.gold} />
              <Text style={styles.badgeCellText}>{b.label}</Text>
            </Pressable>
          ))}
        </View>

        <AppleHeroButton style={styles.saveBtnSpaced} onPress={onSave}>
          Save changes
        </AppleHeroButton>
        <Pressable style={styles.cancelBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </Pressable>
      </ScrollView>

      <Modal visible={levelOpen} transparent animationType="fade" onRequestClose={() => setLevelOpen(false)}>
        <View style={styles.sportModalRoot}>
          <Pressable style={styles.editModalBackdrop} onPress={() => setLevelOpen(false)} />
          <View style={styles.sportModalSheet}>
            <Text style={styles.sportModalTitle}>Competition level</Text>
            <ScrollView style={styles.sportModalList} keyboardShouldPersistTaps="handled">
              {ATHLETE_LEVELS.map((opt) => (
                <Pressable
                  key={opt}
                  style={styles.sportModalRow}
                  onPress={() => {
                    setLevel(opt);
                    setLevelOpen(false);
                  }}
                >
                  <Text style={[styles.sportModalRowText, level === opt && styles.sportModalRowTextOn]}>
                    {opt}
                  </Text>
                  {level === opt ? <FontAwesome name="check" size={16} color={DS.color.gold} /> : null}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

type SectionRow = {
  key: string;
  title: string;
  sub: string;
  icon: 'id-card-o' | 'camera' | 'trophy' | 'star' | 'list-ol' | 'link' | 'align-left';
  status: 'complete' | 'partial' | 'missing';
  onPress: () => void;
};

function StatusDot({ status }: { status: SectionRow['status'] }) {
  const color =
    status === 'complete' ? DS.color.onlineGreen : status === 'partial' ? '#EAB308' : DS.color.error;
  return <View style={[styles.sectionStatusDot, { backgroundColor: color }]} />;
}

export function EditProfileSectionsScreen({ navigation }: PProps<'EditProfileSections'>) {
  const insets = useSafeAreaInsets();
  const rows: SectionRow[] = [
    {
      key: 'basic',
      title: 'Basic Info',
      sub: 'Name, location, contact details',
      icon: 'id-card-o',
      status: 'complete',
      onPress: () => navigation.navigate('EditBasic'),
    },
    {
      key: 'photo',
      title: 'Profile Photo',
      sub: 'Upload or change your profile picture',
      icon: 'camera',
      status: 'complete',
      onPress: () => navigation.navigate('EditProfilePhoto'),
    },
    {
      key: 'athlete',
      title: 'Athlete Details',
      sub: 'Sport, position, team, achievements',
      icon: 'trophy',
      status: 'partial',
      onPress: () => navigation.navigate('EditAthlete'),
    },
    {
      key: 'highlights',
      title: 'Highlights',
      sub: 'Featured videos, photos, moments',
      icon: 'star',
      status: 'missing',
      onPress: () => navigation.navigate('EditProfileSectionDetail', { slug: 'highlights' }),
    },
    {
      key: 'recent',
      title: 'Recent Results',
      sub: 'Latest performance stats and scores',
      icon: 'list-ol',
      status: 'partial',
      onPress: () => navigation.navigate('EditProfileSectionDetail', { slug: 'recentResults' }),
    },
    {
      key: 'social',
      title: 'Social Links',
      sub: 'Instagram, Twitter, website links',
      icon: 'link',
      status: 'complete',
      onPress: () => navigation.navigate('EditProfileSectionDetail', { slug: 'socialLinks' }),
    },
    {
      key: 'bio',
      title: 'Bio & Description',
      sub: 'Personal story, career overview',
      icon: 'align-left',
      status: 'missing',
      onPress: () => navigation.navigate('EditProfileSectionDetail', { slug: 'bioDescription' }),
    },
  ];

  return (
    <View style={styles.root}>
      <ScreenHeader title="Edit Profile" onBack={() => navigation.goBack()} largeTitle />
      <ScrollView
        contentContainerStyle={[styles.padded, { paddingBottom: 32 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionList}>
          {rows.map((r) => (
            <Pressable key={r.key} style={styles.profileSectionCard} onPress={r.onPress}>
              <View style={styles.profileSectionIcon}>
                <FontAwesome name={r.icon} size={14} color={DS.color.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.profileSectionTitleRow}>
                  <Text style={styles.profileSectionTitle}>{r.title}</Text>
                  <StatusDot status={r.status} />
                </View>
                <Text style={styles.profileSectionSub}>{r.sub}</Text>
              </View>
              <FontAwesome name="chevron-right" size={12} color={DS.color.textMuted} />
            </Pressable>
          ))}
        </View>

        <View style={styles.completionCard}>
          <View style={styles.completionHead}>
            <View style={styles.completionIconWrap}>
              <FontAwesome name="pie-chart" size={12} color={DS.color.gold} />
            </View>
            <Text style={styles.completionTitle}>Profile Completion</Text>
          </View>
          <View style={styles.completionTrack}>
            <View style={[styles.completionFill, { width: '65%' }]} />
          </View>
          <Text style={styles.completionHint}>
            65% complete — Add highlights and bio to improve visibility
          </Text>
        </View>

        <Text style={styles.legendTitle}>Status Indicators</Text>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <StatusDot status="complete" />
            <Text style={styles.legendText}>Complete</Text>
          </View>
          <View style={styles.legendItem}>
            <StatusDot status="partial" />
            <Text style={styles.legendText}>Partial</Text>
          </View>
          <View style={styles.legendItem}>
            <StatusDot status="missing" />
            <Text style={styles.legendText}>Missing</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

export function EditProfileSectionDetailScreen({
  navigation,
}: PProps<'EditProfileSectionDetail'>) {
  const route = useRoute<SectionDetailRoute>();
  const slug = route.params.slug;
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState(false);
  const [ig, setIg] = useState('@marcusstroman');
  const [tw, setTw] = useState('@mstro');
  const [web, setWeb] = useState('https://dalton.demo');
  const [longBio, setLongBio] = useState(
    'U20 sprinter focused on 100m / 200m. Training with Grant Access cohort and chasing national standards.',
  );

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(false), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const titles: Record<typeof slug, string> = {
    highlights: 'Highlights',
    recentResults: 'Recent Results',
    socialLinks: 'Social Links',
    bioDescription: 'Bio & Description',
  };

  const HL_THUMBS = [HL_THUMB, HL_THUMB, HL_THUMB];

  return (
    <View style={styles.root}>
      <ScreenHeader title={titles[slug]} onBack={() => navigation.goBack()} largeTitle />
      {toast ? (
        <View style={[styles.editToast, { top: insets.top + 72 }]} pointerEvents="none">
          <FontAwesome name="check-circle" size={18} color={DS.color.white} />
          <Text style={styles.editToastText}> Saved (demo)</Text>
        </View>
      ) : null}
      <ScrollView
        contentContainerStyle={[styles.padded, { paddingBottom: 32 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {slug === 'highlights' ? (
          <>
            <Text style={styles.sectionDetailMuted}>
              Curate clips and images that appear on your public profile.
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hlStrip}>
              {HL_THUMBS.map((u, i) => (
                <Image key={i} source={{ uri: u }} style={styles.hlStripThumb} />
              ))}
            </ScrollView>
            <Pressable style={styles.secondaryBtn}>
              <Text style={styles.secondaryText}>+ Add highlight (demo)</Text>
            </Pressable>
          </>
        ) : null}

        {slug === 'recentResults' ? (
          <>
            <Text style={styles.sectionDetailMuted}>Manage meets and marks shown under Recent Results.</Text>
            {[
              { meet: 'National State Finals', where: 'Austin, TX • Mar 2024', time: '10.42s' },
              { meet: 'Regional Open', where: 'Houston, TX • Feb 2024', time: '10.51s' },
            ].map((row) => (
              <View key={row.meet} style={styles.recentEditCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recentEditMeet}>{row.meet}</Text>
                  <Text style={styles.recentEditWhere}>{row.where}</Text>
                </View>
                <Text style={styles.recentEditTime}>{row.time}</Text>
              </View>
            ))}
            <Pressable style={styles.secondaryBtn}>
              <Text style={styles.secondaryText}>+ Add result (demo)</Text>
            </Pressable>
          </>
        ) : null}

        {slug === 'socialLinks' ? (
          <>
            <Text style={styles.sectionDetailMuted}>These links appear on your athlete card.</Text>
            <Text style={styles.athleteLabel}>Instagram</Text>
            <TextInput style={styles.input} value={ig} onChangeText={setIg} placeholderTextColor={DS.color.textMuted} />
            <Text style={[styles.athleteLabel, styles.labelSpaced]}>X (Twitter)</Text>
            <TextInput style={styles.input} value={tw} onChangeText={setTw} placeholderTextColor={DS.color.textMuted} />
            <Text style={[styles.athleteLabel, styles.labelSpaced]}>Website</Text>
            <TextInput
              style={styles.input}
              value={web}
              onChangeText={setWeb}
              placeholderTextColor={DS.color.textMuted}
              autoCapitalize="none"
            />
          </>
        ) : null}

        {slug === 'bioDescription' ? (
          <>
            <Text style={styles.sectionDetailMuted}>Long-form story for scouts and fans.</Text>
            <TextInput
              style={[styles.input, styles.bioLongInput]}
              multiline
              textAlignVertical="top"
              value={longBio}
              onChangeText={setLongBio}
              maxLength={500}
            />
            <Text style={styles.bioCount}>{longBio.length}/500</Text>
          </>
        ) : null}

        <AppleHeroButton style={styles.saveBtnSpaced} onPress={() => setToast(true)}>
          Save
        </AppleHeroButton>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: DS.color.background,
  },
  profileTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: DS.space.lg,
    paddingBottom: DS.space.md,
  },
  profileTopSpacer: {
    flex: 1,
  },
  iconRound: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DS.color.surface,
  },
  editPill: {
    borderWidth: 1,
    borderColor: DS.color.border,
    paddingHorizontal: DS.space.base,
    paddingVertical: DS.space.sm,
    borderRadius: DS.radius.pill,
  },
  editPillText: {
    color: DS.color.text,
    fontSize: 14,
    fontWeight: '600',
  },
  profileScroll: {
    paddingHorizontal: DS.space.lg,
    alignItems: 'center',
  },
  avatarWrap: {
    padding: 2,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: DS.color.gold,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  profileName: {
    fontFamily: DS.font.heading,
    fontSize: 36,
    fontWeight: '400',
    color: DS.color.gold,
    letterSpacing: 2,
    marginTop: DS.space.base,
    textAlign: 'center',
  },
  tagRow: {
    flexDirection: 'row',
    gap: DS.space.md,
    marginTop: DS.space.md,
  },
  tag: {
    paddingHorizontal: DS.space.base,
    paddingVertical: 6,
    borderRadius: DS.radius.pill,
    borderWidth: 1,
    borderColor: DS.color.goldTint30,
  },
  tagText: {
    fontSize: 12,
    color: DS.color.textMuted,
  },
  statsCard: {
    flexDirection: 'row',
    width: '100%',
    marginTop: DS.space.xl,
    backgroundColor: DS.color.surfaceAlt,
    borderRadius: DS.radius.xxl,
    padding: DS.space.lg,
    borderWidth: 1,
    borderColor: DS.color.borderHairline,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
  },
  statVal: {
    fontFamily: DS.font.heading,
    fontSize: 22,
    fontWeight: '400',
    color: DS.color.gold,
  },
  statLabel: {
    fontSize: 11,
    color: DS.color.textMuted,
    marginTop: 4,
    letterSpacing: 1,
    fontWeight: '600',
  },
  endorseBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: DS.space.lg,
    paddingVertical: DS.space.md,
    backgroundColor: DS.color.gold,
    borderRadius: DS.radius.lg,
  },
  endorseBannerText: {
    fontFamily: DS.font.bodyBold,
    fontSize: 14,
    color: DS.color.background,
    letterSpacing: 1,
  },
  highlightsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginTop: DS.space.xl,
    marginBottom: DS.space.sm,
  },
  sectionTitleKicker: {
    fontFamily: DS.font.bodyBold,
    fontSize: 12,
    color: DS.color.textMuted,
    letterSpacing: 2,
  },
  viewAllGold: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 13,
    color: DS.color.gold,
  },
  highlightsScroll: {
    gap: DS.space.md,
    paddingBottom: DS.space.md,
  },
  highlightCard: {
    width: 140,
    height: 88,
    borderRadius: DS.radius.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  highlightThumb: {
    width: '100%',
    height: '100%',
  },
  highlightPlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -16,
    marginTop: -16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: DS.color.goldTint90,
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 2,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: DS.space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DS.color.borderHairline,
    gap: DS.space.md,
  },
  resultMeet: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 15,
    color: DS.color.text,
  },
  resultWhere: {
    fontFamily: DS.font.body,
    fontSize: 12,
    color: DS.color.textMuted,
    marginTop: 4,
  },
  pbPill: {
    alignItems: 'flex-end',
  },
  pbPillText: {
    fontFamily: DS.font.bodyBold,
    fontSize: 10,
    color: DS.color.gold,
    letterSpacing: 1,
  },
  pbTime: {
    fontFamily: DS.font.heading,
    fontSize: 20,
    color: DS.color.gold,
    marginTop: 2,
  },
  devSectionLabel: {
    alignSelf: 'flex-start',
    marginTop: DS.space.xxl,
    marginBottom: DS.space.sm,
    fontSize: 11,
    color: DS.color.textMuted,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    alignSelf: 'flex-start',
    marginTop: DS.space.xl,
    fontSize: 16,
    fontWeight: '700',
    color: DS.color.text,
    marginBottom: DS.space.sm,
  },
  muted: {
    alignSelf: 'flex-start',
    color: DS.color.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: DS.space.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DS.color.borderHairline,
    gap: DS.space.md,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: DS.color.text,
    fontWeight: '600',
  },
  padded: {
    padding: DS.space.lg,
  },
  settingsLogoRow: {
    alignItems: 'center',
    marginBottom: DS.space.lg,
  },
  accountStatusCard: {
    backgroundColor: DS.color.surfaceAlt,
    borderRadius: DS.radius.xl,
    padding: DS.space.lg,
    marginBottom: DS.space.lg,
    borderWidth: 1,
    borderColor: DS.color.borderHairline,
  },
  accountStatusLabel: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 12,
    fontWeight: '700',
    color: DS.color.gold,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: DS.space.sm,
  },
  accountStatusEmail: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 16,
    color: DS.color.text,
    marginBottom: DS.space.md,
  },
  accountVerifyBadge: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 14,
    fontWeight: '600',
  },
  accountVerifyOn: {
    color: DS.color.gold,
  },
  accountVerifyOff: {
    color: DS.color.textMuted,
  },
  accountStatusHint: {
    fontFamily: DS.font.body,
    fontSize: 13,
    color: DS.color.textMuted,
    marginTop: DS.space.md,
    lineHeight: 19,
  },
  settingsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DS.color.surfaceAlt,
    borderRadius: DS.radius.xl,
    padding: DS.space.base,
    marginBottom: DS.space.md,
    borderWidth: 1,
    borderColor: DS.color.borderHairline,
    gap: DS.space.md,
  },
  settingsIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: DS.color.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: DS.color.text,
  },
  settingsSub: {
    fontSize: 13,
    color: DS.color.textMuted,
    marginTop: 4,
    lineHeight: 18,
  },
  logOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DS.color.gold,
    paddingVertical: DS.space.base,
    borderRadius: DS.radius.lg,
    marginTop: DS.space.xl,
  },
  logOutBtnText: {
    fontFamily: DS.font.bodyBold,
    fontSize: 15,
    color: DS.color.background,
    letterSpacing: 0.5,
  },
  deleteAccountWrap: {
    alignItems: 'center',
    paddingVertical: DS.space.lg,
    marginBottom: DS.space.xl,
  },
  deleteAccountTxt: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 15,
    color: DS.color.error,
  },
  flex1: {
    flex: 1,
  },
  editToast: {
    position: 'absolute',
    left: DS.space.lg,
    right: DS.space.lg,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: DS.space.sm,
    backgroundColor: '#16a34a',
    paddingVertical: DS.space.md,
    paddingHorizontal: DS.space.lg,
    borderRadius: DS.radius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  editToastText: {
    fontSize: 14,
    fontWeight: '600',
    color: DS.color.white,
  },
  editFirstLabel: {
    marginTop: 0,
  },
  labelSpaced: {
    marginTop: DS.space.lg,
  },
  reqStar: {
    color: DS.color.error,
  },
  fieldError: {
    fontSize: 12,
    color: DS.color.error,
    marginTop: 6,
  },
  inputError: {
    borderWidth: 1,
    borderColor: DS.color.error,
  },
  handleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  handleAt: {
    position: 'absolute',
    left: DS.space.base,
    zIndex: 1,
    fontSize: 15,
    color: DS.color.textMuted,
  },
  inputHandle: {
    flex: 1,
    paddingLeft: 28,
  },
  inputBio: {
    minHeight: 112,
    paddingTop: DS.space.base,
  },
  bioCount: {
    fontSize: 12,
    color: DS.color.textMuted,
    marginTop: 6,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  locationIcon: {
    position: 'absolute',
    left: DS.space.base,
    zIndex: 1,
  },
  inputLocation: {
    flex: 1,
    paddingLeft: 36,
  },
  sportTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: DS.color.input,
    borderRadius: DS.radius.lg,
    borderWidth: 1,
    borderColor: DS.color.borderHairline,
    paddingHorizontal: DS.space.base,
    paddingVertical: DS.space.md,
  },
  sportTriggerText: {
    fontSize: 16,
    color: DS.color.text,
  },
  saveBtnSpaced: {
    marginTop: DS.space.xxl,
  },
  cancelBtn: {
    marginTop: DS.space.md,
    backgroundColor: DS.color.surfaceAlt,
    paddingVertical: DS.space.base,
    borderRadius: DS.radius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: DS.color.borderHairline,
  },
  cancelBtnText: {
    color: DS.color.text,
    fontWeight: '600',
    fontSize: 16,
  },
  sportModalRoot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: DS.space.lg,
  },
  editModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  sportModalSheet: {
    width: '100%',
    maxWidth: 340,
    maxHeight: '70%',
    backgroundColor: DS.color.surface,
    borderRadius: DS.radius.xxl,
    borderWidth: 1,
    borderColor: DS.color.borderWhite5,
    paddingVertical: DS.space.md,
    overflow: 'hidden',
  },
  sportModalTitle: {
    fontFamily: DS.font.bodyBold,
    fontSize: 16,
    color: DS.color.text,
    paddingHorizontal: DS.space.lg,
    paddingBottom: DS.space.sm,
    marginBottom: DS.space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DS.color.borderHairline,
  },
  sportModalList: {
    paddingHorizontal: DS.space.sm,
  },
  sportModalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: DS.space.md,
    paddingHorizontal: DS.space.md,
    borderRadius: DS.radius.md,
  },
  sportModalRowText: {
    fontSize: 15,
    color: DS.color.text,
  },
  sportModalRowTextOn: {
    color: DS.color.gold,
    fontWeight: '600',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: DS.color.gold,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: DS.space.sm,
    marginTop: DS.space.md,
  },
  input: {
    backgroundColor: DS.color.input,
    borderRadius: DS.radius.lg,
    padding: DS.space.base,
    fontSize: 16,
    color: DS.color.text,
    borderWidth: 1,
    borderColor: DS.color.borderHairline,
  },
  largeAvatar: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignSelf: 'center',
    marginBottom: DS.space.xl,
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: DS.color.gold,
    paddingVertical: DS.space.md,
    borderRadius: DS.radius.lg,
    alignItems: 'center',
  },
  secondaryText: {
    color: DS.color.gold,
    fontWeight: '600',
  },
  photoHero: {
    alignSelf: 'center',
    marginTop: DS.space.lg,
    marginBottom: DS.space.lg,
    position: 'relative',
  },
  photoGoldRing: {
    padding: 4,
    borderRadius: 200,
    backgroundColor: DS.color.gold,
  },
  photoInnerCircle: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: DS.color.surface,
    overflow: 'hidden',
    position: 'relative',
  },
  photoInnerImg: {
    width: '100%',
    height: '100%',
  },
  photoCropOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 64,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: DS.color.gold,
  },
  photoCameraFab: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: DS.color.gold,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  photoHintTitle: {
    textAlign: 'center',
    fontSize: 14,
    color: DS.color.textMuted,
    marginBottom: 6,
  },
  photoHintSub: {
    textAlign: 'center',
    fontSize: 12,
    color: DS.color.textMuted,
    opacity: 0.85,
    marginBottom: DS.space.xl,
  },
  photoActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: DS.space.md,
    paddingVertical: DS.space.base,
    marginBottom: DS.space.sm,
    borderRadius: DS.radius.lg,
    backgroundColor: DS.color.surfaceAlt,
    borderWidth: 1,
    borderColor: DS.color.borderHairline,
  },
  photoActionRowActive: {
    backgroundColor: DS.color.goldTint10,
    borderColor: DS.color.goldTint30,
  },
  photoActionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: DS.color.text,
  },
  photoRemoveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: DS.space.md,
    paddingVertical: DS.space.base,
    marginBottom: DS.space.lg,
    borderRadius: DS.radius.lg,
    backgroundColor: 'rgba(232, 83, 58, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(232, 83, 58, 0.35)',
  },
  photoRemoveLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: DS.color.error,
  },
  athleteLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: DS.color.text,
    marginBottom: 8,
  },
  athleteHint: {
    fontSize: 12,
    color: DS.color.textMuted,
    marginTop: 6,
  },
  athleteHintSpaced: {
    fontSize: 12,
    color: DS.color.textMuted,
    marginBottom: DS.space.md,
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: DS.space.sm,
  },
  badgeCell: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.space.sm,
    padding: DS.space.md,
    borderRadius: DS.radius.lg,
    backgroundColor: DS.color.surfaceAlt,
    borderWidth: 1,
    borderColor: DS.color.borderHairline,
    marginBottom: DS.space.sm,
  },
  badgeCellOn: {
    borderColor: DS.color.gold,
  },
  badgeCellText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: DS.color.text,
  },
  sectionList: {
    gap: DS.space.md,
  },
  profileSectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.space.md,
    padding: DS.space.base,
    borderRadius: DS.radius.xl,
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  profileSectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: DS.color.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileSectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: DS.color.text,
  },
  profileSectionSub: {
    fontSize: 12,
    color: DS.color.textMuted,
    marginTop: 4,
    lineHeight: 16,
  },
  sectionStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  completionCard: {
    marginTop: DS.space.xl,
    padding: DS.space.base,
    borderRadius: DS.radius.xl,
    backgroundColor: 'rgba(18, 18, 18, 0.85)',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  completionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.space.md,
    marginBottom: DS.space.md,
  },
  completionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: DS.color.goldTint10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: DS.color.text,
  },
  completionTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: DS.color.input,
    overflow: 'hidden',
    marginBottom: DS.space.sm,
  },
  completionFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: DS.color.gold,
  },
  completionHint: {
    fontSize: 12,
    color: DS.color.textMuted,
    lineHeight: 18,
  },
  legendTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: DS.color.textMuted,
    marginTop: DS.space.lg,
    marginBottom: DS.space.sm,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: DS.space.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendText: {
    fontSize: 12,
    color: DS.color.textMuted,
  },
  sectionDetailMuted: {
    fontSize: 14,
    color: DS.color.textMuted,
    lineHeight: 22,
    marginBottom: DS.space.lg,
  },
  hlStrip: {
    marginBottom: DS.space.lg,
  },
  hlStripThumb: {
    width: 140,
    height: 88,
    borderRadius: DS.radius.lg,
    marginRight: DS.space.md,
  },
  recentEditCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: DS.space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DS.color.borderHairline,
    marginBottom: DS.space.sm,
  },
  recentEditMeet: {
    fontSize: 15,
    fontWeight: '600',
    color: DS.color.text,
  },
  recentEditWhere: {
    fontSize: 12,
    color: DS.color.textMuted,
    marginTop: 4,
  },
  recentEditTime: {
    fontFamily: DS.font.heading,
    fontSize: 18,
    color: DS.color.gold,
  },
  bioLongInput: {
    minHeight: 160,
    paddingTop: DS.space.base,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: DS.space.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DS.color.borderHairline,
  },
  toggleOn: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: DS.color.gold,
  },
});
