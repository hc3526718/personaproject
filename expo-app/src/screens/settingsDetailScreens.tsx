import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FontAwesome, FontAwesome5 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '../components/ScreenHeader';
import { DS } from '../designSystem';
import {
  DEFAULT_NOTIFY_PREFS,
  IN_APP_NOTIFY_LABELS,
  loadInAppNotifyPrefs,
  saveInAppNotifyPrefs,
  type InAppNotifyCategory,
  type InAppNotifyPrefs,
} from '../lib/notificationBannerPrefs';

const BANNER_TOGGLE_ORDER: InAppNotifyCategory[] = [
  'postInteraction',
  'messages',
  'eventAttendance',
  'eventBooking',
  'eventCreation',
  'mediaCreation',
  'system',
];

const BANNER_TOGGLE_SUB: Partial<Record<InAppNotifyCategory, string>> = {
  postInteraction: 'Likes, comments, follows, mentions.',
  messages: 'Direct messages & threads.',
  eventAttendance: 'Check-in and attendance outcomes.',
  eventBooking: 'Reservations & booking confirmations.',
  eventCreation: 'New events you publish for your profile.',
  mediaCreation: 'Media uploads & publishing confirmations.',
  system: 'Anything that does not match the categories above.',
};
import type { AllowMessagesFrom } from '../messaging/messagingPrefs';
import { getAllowMessagesFrom, setAllowMessagesFrom } from '../messaging/messagingPrefs';
import type { ProfileStackParamList } from '../navigation/types';
import { loadAccessibilityPrefs, saveAccessibilityPrefs, type AccessibilityPrefs } from '../lib/accessibilityPrefs';
import { useActionBanner } from '../actionBanner/ActionBannerContext';

type PProps<K extends keyof ProfileStackParamList> = NativeStackScreenProps<ProfileStackParamList, K>;

export function AccountSecurityScreen({ navigation }: PProps<'AccountSecurity'>) {
  const insets = useSafeAreaInsets();
  const [twoFa, setTwoFa] = useState(true);
  return (
    <View style={styles.root}>
      <ScreenHeader title="Account & Security" onBack={() => navigation.goBack()} largeTitle />
      <ScrollView
        contentContainerStyle={[styles.padded, { paddingBottom: 32 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.cardKicker}>Sign-in</Text>
        <View style={styles.card}>
          <Text style={styles.labelSm}>Email</Text>
          <TextInput
            style={styles.input}
            defaultValue="athlete@dalton.demo"
            placeholderTextColor={DS.color.textMuted}
            editable={false}
          />
          <Text style={styles.labelSmSpaced}>Password</Text>
          <Pressable style={styles.rowBtn}>
            <Text style={styles.rowBtnText}>Change password</Text>
            <FontAwesome name="chevron-right" size={12} color={DS.color.textMuted} />
          </Pressable>
        </View>
        <Text style={styles.cardKickerSpaced}>Two-factor authentication</Text>
        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>Authenticator app</Text>
              <Text style={styles.toggleSub}>Extra security for your account (demo).</Text>
            </View>
            <Switch value={twoFa} onValueChange={setTwoFa} trackColor={{ true: DS.color.goldTint30 }} />
          </View>
        </View>
        <Text style={styles.cardKickerSpaced}>Sessions</Text>
        <View style={styles.card}>
          {['This device · iPhone', 'Web · Chrome · London'].map((s) => (
            <View key={s} style={styles.sessionRow}>
              <FontAwesome name="mobile" size={16} color={DS.color.gold} />
              <Text style={styles.sessionText}>{s}</Text>
            </View>
          ))}
        </View>
        <Pressable style={styles.dangerOutline}>
          <Text style={styles.dangerOutlineText}>Sign out all other sessions</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

export function PrivacyVisibilityScreen({ navigation }: PProps<'PrivacyVisibility'>) {
  const insets = useSafeAreaInsets();
  const [pub, setPub] = useState(true);
  const [showResults, setShowResults] = useState(true);
  const [dataShare, setDataShare] = useState(false);
  const [dmPolicy, setDmPolicy] = useState<AllowMessagesFrom>(() => getAllowMessagesFrom());
  const applyDm = (value: AllowMessagesFrom) => {
    setAllowMessagesFrom(value);
    setDmPolicy(value);
    Alert.alert('Messages', 'Preference saved locally. Sync to `profiles.allow_messages_from` with Supabase.');
  };
  return (
    <View style={styles.root}>
      <ScreenHeader title="Privacy & Visibility" onBack={() => navigation.goBack()} largeTitle />
      <ScrollView
        contentContainerStyle={[styles.padded, { paddingBottom: 32 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.bodyMuted}>
          Control who sees your profile and how your data is used in the Dalton demo.
        </Text>
        <Text style={styles.cardKicker}>Direct messages</Text>
        <Text style={styles.bodyMutedSm}>
          Who can start a new conversation with you (enforced server-side when live).
        </Text>
        <View style={styles.card}>
          {(
            [
              { key: 'everyone' as const, label: 'Everyone', sub: 'Including people you do not follow' },
              { key: 'followers_only' as const, label: 'Followers only', sub: 'Must follow you first' },
              { key: 'friends_only' as const, label: 'Friends only', sub: 'Mutual follows / accepted requests' },
            ] as const
          ).map((opt) => (
            <Pressable
              key={opt.key}
              style={[styles.dmRow, dmPolicy === opt.key && styles.dmRowOn]}
              onPress={() => applyDm(opt.key)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.dmRowTitle}>{opt.label}</Text>
                <Text style={styles.dmRowSub}>{opt.sub}</Text>
              </View>
              <View style={[styles.radioOuter, dmPolicy === opt.key && styles.radioOuterOn]}>
                {dmPolicy === opt.key ? <View style={styles.radioInner} /> : null}
              </View>
            </Pressable>
          ))}
        </View>
        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>Public profile</Text>
              <Text style={styles.toggleSub}>Discoverable in search and community.</Text>
            </View>
            <Switch value={pub} onValueChange={setPub} trackColor={{ true: DS.color.goldTint30 }} />
          </View>
          <View style={styles.hairline} />
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>Show recent results</Text>
              <Text style={styles.toggleSub}>Display meet marks on your profile.</Text>
            </View>
            <Switch value={showResults} onValueChange={setShowResults} trackColor={{ true: DS.color.goldTint30 }} />
          </View>
          <View style={styles.hairline} />
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>Partner analytics</Text>
              <Text style={styles.toggleSub}>Share anonymized usage with sponsors.</Text>
            </View>
            <Switch value={dataShare} onValueChange={setDataShare} trackColor={{ true: DS.color.goldTint30 }} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

export function NotificationPrefsScreen({ navigation }: PProps<'NotificationPrefs'>) {
  const insets = useSafeAreaInsets();
  const [push, setPush] = useState(true);
  const [email, setEmail] = useState(true);
  const [events, setEvents] = useState(true);
  const [community, setCommunity] = useState(false);
  const [bannerPrefs, setBannerPrefs] = useState<InAppNotifyPrefs>(DEFAULT_NOTIFY_PREFS);

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        setBannerPrefs(await loadInAppNotifyPrefs());
      })();
    }, []),
  );

  const patchBanner = async (partial: Partial<InAppNotifyPrefs>) => {
    await saveInAppNotifyPrefs(partial);
    setBannerPrefs(await loadInAppNotifyPrefs());
  };

  return (
    <View style={styles.root}>
      <ScreenHeader title="Notifications" onBack={() => navigation.goBack()} largeTitle />
      <ScrollView
        contentContainerStyle={[styles.padded, { paddingBottom: 32 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleTitle}>Push notifications</Text>
            <Switch value={push} onValueChange={setPush} trackColor={{ true: DS.color.goldTint30 }} />
          </View>
          <View style={styles.hairline} />
          <View style={styles.toggleRow}>
            <Text style={styles.toggleTitle}>Email digest</Text>
            <Switch value={email} onValueChange={setEmail} trackColor={{ true: DS.color.goldTint30 }} />
          </View>
          <View style={styles.hairline} />
          <View style={styles.toggleRow}>
            <Text style={styles.toggleTitle}>Event reminders</Text>
            <Switch value={events} onValueChange={setEvents} trackColor={{ true: DS.color.goldTint30 }} />
          </View>
          <View style={styles.hairline} />
          <View style={styles.toggleRow}>
            <Text style={styles.toggleTitle}>Community mentions</Text>
            <Switch value={community} onValueChange={setCommunity} trackColor={{ true: DS.color.goldTint30 }} />
          </View>
        </View>

        <Text style={styles.cardKickerSpaced}>In-app banners</Text>
        <Text style={styles.bodyMuted}>
          Stored preferences for future in-app notification banners (Community opens the full notifications list
          from the gold bell).
        </Text>
        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>Allow in-app banners</Text>
              <Text style={styles.toggleSub}>Master switch for future in-app notification surfaces.</Text>
            </View>
            <Switch
              value={bannerPrefs.enabled}
              onValueChange={(v) => void patchBanner({ enabled: v })}
              trackColor={{ true: DS.color.goldTint30 }}
            />
          </View>
          {BANNER_TOGGLE_ORDER.map((key) => (
            <View key={key}>
              <View style={styles.hairline} />
              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleTitle}>{IN_APP_NOTIFY_LABELS[key]}</Text>
                  <Text style={styles.toggleSub}>{BANNER_TOGGLE_SUB[key] ?? ''}</Text>
                </View>
                <Switch
                  value={bannerPrefs[key]}
                  onValueChange={(v) => void patchBanner({ [key]: v } as Partial<InAppNotifyPrefs>)}
                  trackColor={{ true: DS.color.goldTint30 }}
                  disabled={!bannerPrefs.enabled}
                />
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

export function AccessibilityScreen({ navigation }: PProps<'Accessibility'>) {
  const insets = useSafeAreaInsets();
  const showBanner = useActionBanner();
  const [prefs, setPrefs] = useState<AccessibilityPrefs | null>(null);

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        setPrefs(await loadAccessibilityPrefs());
      })();
    }, []),
  );

  const patch = async (partial: Partial<AccessibilityPrefs>, label: string) => {
    await saveAccessibilityPrefs(partial);
    const next = await loadAccessibilityPrefs();
    setPrefs(next);
    const on = Object.values(partial)[0] === true;
    showBanner(label, on ? 'Enabled' : 'Disabled');
  };

  if (!prefs) {
    return (
      <View style={styles.root}>
        <ScreenHeader title="Accessibility" onBack={() => navigation.goBack()} largeTitle />
        <View style={[styles.padded, { paddingBottom: 32 + insets.bottom }]}>
          <Text style={styles.bodyMuted}>Loading…</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScreenHeader title="Accessibility" onBack={() => navigation.goBack()} largeTitle />
      <ScrollView
        contentContainerStyle={[styles.padded, { paddingBottom: 32 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.bodyMuted}>
          These toggles store your preferences locally. Some options can be fully applied in React Native
          (like reduced motion); others affect how Dalton renders UI and will be expanded over time.
        </Text>

        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>VoiceOver</Text>
              <Text style={styles.toggleSub}>Gesture, keyboard, braille, and speech navigation.</Text>
            </View>
            <Switch
              value={prefs.voiceOver}
              onValueChange={(v) => void patch({ voiceOver: v }, 'VoiceOver')}
              trackColor={{ true: DS.color.goldTint30 }}
            />
          </View>
          <View style={styles.hairline} />
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>Voice Control</Text>
              <Text style={styles.toggleSub}>Navigate and interact using voice commands.</Text>
            </View>
            <Switch
              value={prefs.voiceControl}
              onValueChange={(v) => void patch({ voiceControl: v }, 'Voice Control')}
              trackColor={{ true: DS.color.goldTint30 }}
            />
          </View>
        </View>

        <Text style={styles.cardKickerSpaced}>Display</Text>
        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>Larger Text</Text>
              <Text style={styles.toggleSub}>Scale text up to improve readability.</Text>
            </View>
            <Switch
              value={prefs.largerText}
              onValueChange={(v) => void patch({ largerText: v }, 'Larger Text')}
              trackColor={{ true: DS.color.goldTint30 }}
            />
          </View>
          <View style={styles.hairline} />
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>Light Interface</Text>
              <Text style={styles.toggleSub}>Use a light color scheme instead of dark.</Text>
            </View>
            <Switch
              value={prefs.lightInterface}
              onValueChange={(v) => void patch({ lightInterface: v }, 'Light Interface')}
              trackColor={{ true: DS.color.goldTint30 }}
            />
          </View>
          <View style={styles.hairline} />
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>Differentiate Without Color</Text>
              <Text style={styles.toggleSub}>Use text/shapes in addition to color for emphasis.</Text>
            </View>
            <Switch
              value={prefs.differentiateWithoutColor}
              onValueChange={(v) => void patch({ differentiateWithoutColor: v }, 'Differentiate Without Color')}
              trackColor={{ true: DS.color.goldTint30 }}
            />
          </View>
          <View style={styles.hairline} />
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>Sufficient Contrast</Text>
              <Text style={styles.toggleSub}>Increase contrast between text/icons and backgrounds.</Text>
            </View>
            <Switch
              value={prefs.sufficientContrast}
              onValueChange={(v) => void patch({ sufficientContrast: v }, 'Sufficient Contrast')}
              trackColor={{ true: DS.color.goldTint30 }}
            />
          </View>
        </View>

        <Text style={styles.cardKickerSpaced}>Motion & Media</Text>
        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>Reduced Motion</Text>
              <Text style={styles.toggleSub}>Reduce animations that may cause discomfort.</Text>
            </View>
            <Switch
              value={prefs.reducedMotion}
              onValueChange={(v) => void patch({ reducedMotion: v }, 'Reduced Motion')}
              trackColor={{ true: DS.color.goldTint30 }}
            />
          </View>
          <View style={styles.hairline} />
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>Captions</Text>
              <Text style={styles.toggleSub}>Prefer captions for video/audio content.</Text>
            </View>
            <Switch
              value={prefs.captions}
              onValueChange={(v) => void patch({ captions: v }, 'Captions')}
              trackColor={{ true: DS.color.goldTint30 }}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

export function SupportScreen({ navigation }: PProps<'Support'>) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.root}>
      <ScreenHeader title="Support" onBack={() => navigation.goBack()} largeTitle />
      <ScrollView
        contentContainerStyle={[styles.padded, { paddingBottom: 32 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable style={styles.supportCard}>
          <FontAwesome5 name="book-open" size={18} color={DS.color.gold} solid />
          <View style={{ flex: 1, marginLeft: DS.space.md }}>
            <Text style={styles.supportTitle}>Help center</Text>
            <Text style={styles.supportSub}>Guides, FAQs, and troubleshooting.</Text>
          </View>
          <FontAwesome name="chevron-right" size={12} color={DS.color.textMuted} />
        </Pressable>
        <Pressable style={styles.supportCard}>
          <FontAwesome name="envelope-o" size={18} color={DS.color.gold} />
          <View style={{ flex: 1, marginLeft: DS.space.md }}>
            <Text style={styles.supportTitle}>Contact us</Text>
            <Text style={styles.supportSub}>support@dalton.demo (static showcase).</Text>
          </View>
          <FontAwesome name="chevron-right" size={12} color={DS.color.textMuted} />
        </Pressable>
        <Pressable style={styles.supportCard}>
          <FontAwesome name="comments-o" size={18} color={DS.color.gold} />
          <View style={{ flex: 1, marginLeft: DS.space.md }}>
            <Text style={styles.supportTitle}>Live chat</Text>
            <Text style={styles.supportSub}>Weekdays 9–17 GMT (demo UI only).</Text>
          </View>
          <FontAwesome name="chevron-right" size={12} color={DS.color.textMuted} />
        </Pressable>
      </ScrollView>
    </View>
  );
}

export function LegalScreen({ navigation }: PProps<'Legal'>) {
  const insets = useSafeAreaInsets();
  const rows = [
    { title: 'Terms of service', sub: 'Platform rules and eligibility' },
    { title: 'Privacy policy', sub: 'How we handle your data' },
    { title: 'Cookie policy', sub: 'Tracking and preferences' },
    { title: 'Athlete agreement', sub: 'Grant Access program terms' },
  ];
  return (
    <View style={styles.root}>
      <ScreenHeader title="Legal" onBack={() => navigation.goBack()} largeTitle />
      <ScrollView
        contentContainerStyle={[styles.padded, { paddingBottom: 32 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {rows.map((r) => (
          <Pressable key={r.title} style={styles.legalRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.legalTitle}>{r.title}</Text>
              <Text style={styles.legalSub}>{r.sub}</Text>
            </View>
            <FontAwesome name="external-link" size={14} color={DS.color.textMuted} />
          </Pressable>
        ))}
        <Text style={styles.legalFoot}>Static demo — links do not open external URLs.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DS.color.background },
  padded: { padding: DS.space.lg },
  cardKicker: {
    fontFamily: DS.font.bodyBold,
    fontSize: 11,
    color: DS.color.textMuted,
    letterSpacing: 2,
    marginBottom: DS.space.sm,
  },
  cardKickerSpaced: {
    fontFamily: DS.font.bodyBold,
    fontSize: 11,
    color: DS.color.textMuted,
    letterSpacing: 2,
    marginTop: DS.space.xl,
    marginBottom: DS.space.sm,
  },
  card: {
    backgroundColor: DS.color.surfaceAlt,
    borderRadius: DS.radius.xl,
    borderWidth: 1,
    borderColor: DS.color.borderHairline,
    padding: DS.space.base,
  },
  labelSm: {
    fontSize: 12,
    color: DS.color.textMuted,
    marginBottom: 6,
  },
  labelSmSpaced: {
    fontSize: 12,
    color: DS.color.textMuted,
    marginTop: DS.space.md,
    marginBottom: 6,
  },
  input: {
    backgroundColor: DS.color.input,
    borderRadius: DS.radius.lg,
    padding: DS.space.md,
    color: DS.color.textMuted,
    fontSize: 15,
  },
  rowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: DS.space.md,
  },
  rowBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: DS.color.text,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.space.md,
    paddingVertical: DS.space.sm,
  },
  toggleTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: DS.color.text,
  },
  toggleSub: {
    fontSize: 12,
    color: DS.color.textMuted,
    marginTop: 4,
    lineHeight: 16,
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: DS.color.borderHairline,
    marginVertical: DS.space.sm,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.space.md,
    paddingVertical: DS.space.sm,
  },
  sessionText: {
    fontSize: 14,
    color: DS.color.text,
  },
  dangerOutline: {
    marginTop: DS.space.xl,
    paddingVertical: DS.space.md,
    borderRadius: DS.radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(232, 83, 58, 0.5)',
    alignItems: 'center',
  },
  dangerOutlineText: {
    color: DS.color.error,
    fontWeight: '600',
    fontSize: 14,
  },
  bodyMuted: {
    fontSize: 14,
    color: DS.color.textMuted,
    lineHeight: 22,
    marginBottom: DS.space.lg,
  },
  bodyMutedSm: {
    fontSize: 12,
    color: DS.color.textMuted,
    lineHeight: 18,
    marginBottom: DS.space.md,
  },
  dmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: DS.space.md,
    paddingHorizontal: DS.space.sm,
    borderRadius: DS.radius.md,
  },
  dmRowOn: {
    backgroundColor: DS.color.goldTint10,
  },
  dmRowTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: DS.color.text,
  },
  dmRowSub: {
    fontSize: 12,
    color: DS.color.textMuted,
    marginTop: 2,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: DS.color.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterOn: {
    borderColor: DS.color.gold,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: DS.color.gold,
  },
  supportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DS.color.surfaceAlt,
    borderRadius: DS.radius.xl,
    borderWidth: 1,
    borderColor: DS.color.borderHairline,
    padding: DS.space.base,
    marginBottom: DS.space.md,
    gap: DS.space.sm,
  },
  supportTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: DS.color.text,
  },
  supportSub: {
    fontSize: 12,
    color: DS.color.textMuted,
    marginTop: 4,
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: DS.space.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DS.color.borderHairline,
    gap: DS.space.md,
  },
  legalTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: DS.color.text,
  },
  legalSub: {
    fontSize: 12,
    color: DS.color.textMuted,
    marginTop: 4,
  },
  legalFoot: {
    marginTop: DS.space.xl,
    fontSize: 12,
    color: DS.color.textMuted,
    textAlign: 'center',
  },
});
