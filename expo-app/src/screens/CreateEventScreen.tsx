import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FontAwesome } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthContext';
import { AppLoadingIndicator } from '../components/AppLoadingIndicator';
import { AppButton } from '../components/ui/AppButton';
import { FormField } from '../components/ui/FormField';
import { ScreenHeader } from '../components/ScreenHeader';
import { DS } from '../designSystem';
import type { EventsStackParamList } from '../navigation/types';
import { insertCommunityEvent } from '../roadmap/liveDataService';
import { useSubscription } from '../subscriptions/SubscriptionContext';
import { hasPremiumOrAdminTier } from '../subscriptions/navigateToPremiumPaywall';
import { gatePremiumFeatureAccess } from '../subscriptions/premiumFeatureGate';
import { endsAtAfterDuration, parseEventStartIso } from '../lib/eventFormParse';
import { getSupabase } from '../lib/supabase';

type Props = NativeStackScreenProps<EventsStackParamList, 'CreateEvent'>;

type AssetItem = { uri: string; kind: 'image' | 'video' };

const LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Elite', 'All levels'] as const;
const DESC_MIN = 100;

function inferImageContentType(uri: string): string {
  const u = uri.toLowerCase().split('?')[0] ?? '';
  if (u.endsWith('.png')) return 'image/png';
  if (u.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

function inferImageExt(uri: string): string {
  const u = uri.toLowerCase().split('?')[0] ?? '';
  const dot = u.lastIndexOf('.');
  const ext = dot !== -1 ? u.slice(dot + 1) : '';
  if (ext && ext.length <= 5 && /^[a-z0-9]+$/.test(ext)) return ext;
  return 'jpg';
}

/** Uploads a local hero image to the `media_assets` bucket and returns its public URL. */
async function uploadEventHero(userId: string, uri: string): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const blob = await (await fetch(uri)).blob();
    const ext = inferImageExt(uri);
    const contentType = inferImageContentType(uri);
    const rand = Math.random().toString(36).slice(2, 8);
    const storage_path = `events/${userId}/hero-${Date.now()}-${rand}.${ext}`;
    const { error } = await supabase.storage
      .from('media_assets')
      .upload(storage_path, blob, { contentType, upsert: false });
    if (error) return null;
    const pub = supabase.storage.from('media_assets').getPublicUrl(storage_path);
    return pub.data.publicUrl ?? null;
  } catch {
    return null;
  }
}

export function CreateEventScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { isPro, refresh: refreshSubscription, notifyNewPremiumFromPaywall } = useSubscription();
  const tierOk = hasPremiumOrAdminTier(isPro, user?.role);
  const verified = !!user?.daltonVerified;

  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [eventTitle, setEventTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventTags, setEventTags] = useState('');
  const [costFree, setCostFree] = useState(true);
  const [price, setPrice] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [timeStr, setTimeStr] = useState('');
  const [duration, setDuration] = useState('');
  const [level, setLevel] = useState<(typeof LEVELS)[number]>('Intermediate');
  const [agenda, setAgenda] = useState<{ title: string; time: string }[]>([
    { title: '', time: '' },
    { title: '', time: '' },
  ]);
  const [faqs, setFaqs] = useState<{ q: string; a: string }[]>([{ q: '', a: '' }]);
  const [bring, setBring] = useState('');
  const [publishing, setPublishing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (tierOk) return undefined;
      let cancelled = false;
      void (async () => {
        const allowed = await gatePremiumFeatureAccess({
          navigation,
          isPro,
          user,
          refreshSubscription,
          notifyNewPremiumFromPaywall,
        });
        if (cancelled || allowed !== 'allowed') {
          if (!cancelled) navigation.goBack();
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [
      tierOk,
      navigation,
      refreshSubscription,
      user?.role,
      notifyNewPremiumFromPaywall,
    ]),
  );

  const sortedAssets = useMemo(
    () => [...assets].sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'image' ? -1 : 1)),
    [assets],
  );

  const pickImages = useCallback(async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not on web', 'Use a device build to attach images.');
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.9,
    });
    if (res.canceled) return;
    setAssets((prev) => [
      ...prev,
      ...res.assets.filter((a) => a.uri).map((a) => ({ uri: a.uri, kind: 'image' as const })),
    ]);
  }, []);

  const pickVideos = useCallback(async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not on web', 'Use a device build to attach videos.');
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      quality: 1,
    });
    if (res.canceled || !res.assets[0]?.uri) return;
    setAssets((prev) => [...prev, { uri: res.assets[0].uri, kind: 'video' }]);
  }, []);

  const removeAsset = useCallback((uri: string) => {
    setAssets((prev) => prev.filter((x) => x.uri !== uri));
  }, []);

  const submit = useCallback(() => {
    if (publishing || !user?.id || user.id.startsWith('demo-')) {
      if (!user?.id || user.id.startsWith('demo-')) {
        Alert.alert('Sign in required', 'Create an account to publish community events.');
      }
      return;
    }
    const errs: string[] = [];
    if (!eventTitle.trim()) errs.push('Event title is required.');
    if (description.trim().length < DESC_MIN) {
      errs.push(`Description must be at least ${DESC_MIN} characters.`);
    }
    if (!dateStr.trim() || !timeStr.trim()) errs.push('Date and time are required.');
    if (!costFree) {
      const n = parseFloat(price.replace(/[^0-9.]/g, ''));
      if (!price.trim() || Number.isNaN(n) || n < 0) errs.push('Enter a valid price for paid events.');
    }
    const completeAgenda = agenda.filter((row) => row.title.trim() && row.time.trim());
    const partialAgenda = agenda.some(
      (row) => (row.title.trim() || row.time.trim()) && !(row.title.trim() && row.time.trim()),
    );
    if (completeAgenda.length === 0) errs.push('Add at least one agenda item with title and time.');
    if (partialAgenda) errs.push('Finish incomplete agenda rows or clear them.');
    if (errs.length) {
      Alert.alert('Check form', errs.join('\n'));
      return;
    }
    const starts = parseEventStartIso(dateStr, timeStr);
    if (!starts) {
      Alert.alert('Check date & time', 'Use YYYY-MM-DD for the date and a time like 10:00 AM or 14:30.');
      return;
    }
    const ends = endsAtAfterDuration(starts, duration);
    const firstImage = sortedAssets.find((a) => a.kind === 'image');
    const faqLines = faqs
      .filter((f) => f.q.trim() && f.a.trim())
      .map((f) => `Q: ${f.q.trim()}\nA: ${f.a.trim()}`);
    const agendaBlock = completeAgenda.map((row) => `• ${row.time.trim()} — ${row.title.trim()}`).join('\n');
    const descParts: string[] = [
      description.trim(),
      '',
      `Level: ${level}`,
      `Tags: ${eventTags.trim() || '—'}`,
      '',
      'Agenda:',
      agendaBlock,
    ];
    if (faqLines.length > 0) {
      descParts.push('', 'FAQs:', ...faqLines);
    }
    descParts.push('', `What to bring: ${bring.trim() || '—'}`);
    const longDesc = descParts.join('\n');

    setPublishing(true);
    void (async () => {
      let hero: string | null = null;
      if (firstImage?.uri) {
        if (/^https?:\/\//i.test(firstImage.uri)) {
          hero = firstImage.uri;
        } else {
          hero = await uploadEventHero(user.id, firstImage.uri);
        }
      }
      const row = await insertCommunityEvent({
        title: eventTitle.trim(),
        description: longDesc,
        starts_at: starts,
        ends_at: ends,
        venue: null,
        hero_image_url: hero,
        requires_payment: !costFree,
        stripe_price_id: null,
        created_by: user.id,
      });
      setPublishing(false);
      if (!row) {
        Alert.alert(
          'Could not publish',
          'Check your connection and that your account can create events, then try again.',
        );
        return;
      }
      Alert.alert('Event published', row.title, [{ text: 'OK', onPress: () => navigation.goBack() }]);
    })();
  }, [
    publishing,
    user?.id,
    eventTitle,
    description,
    dateStr,
    timeStr,
    duration,
    costFree,
    price,
    agenda,
    eventTags,
    level,
    faqs,
    bring,
    sortedAssets,
    navigation,
  ]);

  if (!tierOk) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <ScreenHeader title="Create event" onBack={() => navigation.goBack()} />
        <View style={styles.gateBody}>
          <AppLoadingIndicator />
          <Text style={[styles.gateTxt, { marginTop: DS.space.lg, textAlign: 'center' }]}>
            Opening subscription options…
          </Text>
        </View>
      </View>
    );
  }

  if (!verified) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <ScreenHeader title="Create event" onBack={() => navigation.goBack()} />
        <View style={styles.gateBody}>
          <FontAwesome name="lock" size={40} color={DS.color.textMuted} />
          <Text style={styles.gateTitle}>Dalton verified</Text>
          <Text style={styles.gateTxt}>
            Your account needs Dalton verification before publishing events. Complete verification in Settings
            when your profile is approved.
          </Text>
          <AppButton label="Back" onPress={() => navigation.goBack()} variant="secondary" />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader title="Create event" onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lead}>
          Cover order: images display first, then video. All fields marked * are required unless noted.
        </Text>

        <FormField label="Event media" required hint="Add images first (cover), then optional video.">
          <View style={styles.assetActions}>
            <AppButton
              label="Add images"
              onPress={pickImages}
              variant="secondary"
              style={styles.fullBtn}
            />
            <AppButton
              label="Add video"
              onPress={pickVideos}
              variant="secondary"
              style={styles.fullBtn}
            />
          </View>
          {sortedAssets.length ? (
            <View style={styles.assetList}>
              {sortedAssets.map((a) => (
                <View key={a.uri} style={styles.assetRow}>
                  <FontAwesome
                    name={a.kind === 'image' ? 'image' : 'video-camera'}
                    size={14}
                    color={DS.color.gold}
                  />
                  <Text style={styles.assetUri} numberOfLines={1}>
                    {a.kind.toUpperCase()} · {a.uri.slice(-42)}
                  </Text>
                  <Pressable onPress={() => removeAsset(a.uri)} hitSlop={8}>
                    <FontAwesome name="times-circle" size={18} color={DS.color.textMuted} />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.mutedSm}>No assets yet — at least one image is recommended.</Text>
          )}
        </FormField>

        <FormField label="Event title" required>
          <TextInput
            value={eventTitle}
            onChangeText={setEventTitle}
            placeholder="Strength camp — spring session"
            placeholderTextColor={DS.color.textMuted}
            style={styles.input}
          />
        </FormField>

        <FormField
          label="Description"
          required
          hint={`Minimum ${DESC_MIN} characters (${description.trim().length}/${DESC_MIN})`}
        >
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Who it is for, format, safety, cancellation…"
            placeholderTextColor={DS.color.textMuted}
            style={[styles.input, styles.inputMulti]}
            multiline
            textAlignVertical="top"
          />
        </FormField>

        <FormField label="Event tags" hint="Optional — comma-separated.">
          <TextInput
            value={eventTags}
            onChangeText={setEventTags}
            placeholder="strength, conditioning, small group"
            placeholderTextColor={DS.color.textMuted}
            style={styles.input}
          />
        </FormField>

        <FormField label="Cost" required>
          <View style={styles.segment}>
            <Pressable
              onPress={() => setCostFree(true)}
              style={[styles.segBtn, costFree && styles.segBtnOn]}
            >
              <Text style={[styles.segTxt, costFree && styles.segTxtOn]}>Free</Text>
            </Pressable>
            <Pressable
              onPress={() => setCostFree(false)}
              style={[styles.segBtn, !costFree && styles.segBtnOn]}
            >
              <Text style={[styles.segTxt, !costFree && styles.segTxtOn]}>Paid</Text>
            </Pressable>
          </View>
          {!costFree ? (
            <TextInput
              value={price}
              onChangeText={setPrice}
              placeholder="Amount in USD (e.g. 49.99)"
              placeholderTextColor={DS.color.textMuted}
              keyboardType="decimal-pad"
              style={[styles.input, { marginTop: DS.space.md }]}
            />
          ) : null}
        </FormField>

        <FormField label="Date" required>
          <TextInput
            value={dateStr}
            onChangeText={setDateStr}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={DS.color.textMuted}
            style={styles.input}
          />
        </FormField>

        <FormField label="Time" required>
          <TextInput
            value={timeStr}
            onChangeText={setTimeStr}
            placeholder="e.g. 10:00 AM"
            placeholderTextColor={DS.color.textMuted}
            style={styles.input}
          />
        </FormField>

        <FormField label="Duration" hint="Optional — e.g. 2 hours">
          <TextInput
            value={duration}
            onChangeText={setDuration}
            placeholder="2 hours"
            placeholderTextColor={DS.color.textMuted}
            style={styles.input}
          />
        </FormField>

        <FormField label="Level" required>
          <View style={styles.chipWrap}>
            {LEVELS.map((lv) => (
              <Pressable
                key={lv}
                onPress={() => setLevel(lv)}
                style={[styles.chip, level === lv && styles.chipOn]}
              >
                <Text style={[styles.chipTxt, level === lv && styles.chipTxtOn]}>{lv}</Text>
              </Pressable>
            ))}
          </View>
        </FormField>

        <Text style={styles.sectionLabel}>Agenda *</Text>
        <Text style={styles.mutedSm}>Each row needs a segment title and time window.</Text>
        {agenda.map((row, i) => (
          <View key={i} style={styles.agendaRow}>
            <TextInput
              value={row.time}
              onChangeText={(t) =>
                setAgenda((rows) => rows.map((r, j) => (j === i ? { ...r, time: t } : r)))
              }
              placeholder="10:00 AM"
              placeholderTextColor={DS.color.textMuted}
              style={[styles.input, styles.agendaTime]}
            />
            <TextInput
              value={row.title}
              onChangeText={(t) =>
                setAgenda((rows) => rows.map((r, j) => (j === i ? { ...r, title: t } : r)))
              }
              placeholder="Session title"
              placeholderTextColor={DS.color.textMuted}
              style={[styles.input, styles.agendaTitle]}
            />
          </View>
        ))}
        <AppButton
          label="Add agenda row"
          onPress={() => setAgenda((r) => [...r, { title: '', time: '' }])}
          variant="ghost"
        />

        <Text style={[styles.sectionLabel, { marginTop: DS.apple.sectionGap }]}>FAQs</Text>
        <Text style={styles.mutedSm}>Optional but recommended for paid or capacity-limited events.</Text>
        {faqs.map((f, i) => (
          <View key={i} style={styles.faqBlock}>
            <TextInput
              value={f.q}
              onChangeText={(t) =>
                setFaqs((rows) => rows.map((r, j) => (j === i ? { ...r, q: t } : r)))
              }
              placeholder="Question"
              placeholderTextColor={DS.color.textMuted}
              style={styles.input}
            />
            <TextInput
              value={f.a}
              onChangeText={(t) =>
                setFaqs((rows) => rows.map((r, j) => (j === i ? { ...r, a: t } : r)))
              }
              placeholder="Answer"
              placeholderTextColor={DS.color.textMuted}
              style={[styles.input, styles.inputMulti, { minHeight: 72 }]}
              multiline
            />
          </View>
        ))}
        <AppButton
          label="Add FAQ"
          onPress={() => setFaqs((r) => [...r, { q: '', a: '' }])}
          variant="ghost"
        />

        <View style={{ marginTop: DS.space.lg }}>
        <FormField
          label="What to bring"
          hint="Optional — comma-separated list."
        >
          <TextInput
            value={bring}
            onChangeText={setBring}
            placeholder="Water bottle, towel, indoor shoes"
            placeholderTextColor={DS.color.textMuted}
            style={styles.input}
          />
        </FormField>
        </View>

        <View style={{ height: DS.apple.sectionGap }} />
        <AppButton label="Publish event" onPress={submit} loading={publishing} />
        <View style={{ height: DS.space.md }} />
        <AppButton label="Cancel" onPress={() => navigation.goBack()} variant="ghost" />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DS.color.background },
  body: { paddingHorizontal: DS.space.lg, paddingTop: DS.space.md },
  lead: {
    fontFamily: DS.font.body,
    fontSize: 14,
    color: DS.color.textMuted,
    lineHeight: 21,
    marginBottom: DS.apple.sectionGap,
  },
  input: {
    backgroundColor: DS.apple.fillSecondary,
    borderRadius: DS.apple.radiusField,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: DS.apple.separator,
    paddingHorizontal: DS.space.base,
    paddingVertical: 14,
    fontFamily: DS.font.body,
    fontSize: 16,
    color: DS.color.text,
  },
  inputMulti: { minHeight: 120, paddingTop: 14 },
  sectionLabel: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 13,
    color: DS.color.textMuted,
    marginBottom: DS.space.xs,
  },
  mutedSm: {
    fontFamily: DS.font.body,
    fontSize: 12,
    color: DS.color.textMuted,
    marginBottom: DS.space.md,
    lineHeight: 17,
  },
  assetActions: { gap: DS.space.sm, marginBottom: DS.space.md },
  fullBtn: { alignSelf: 'stretch' },
  assetList: { gap: DS.space.sm },
  assetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.space.sm,
    padding: DS.space.md,
    borderRadius: DS.apple.radiusField,
    backgroundColor: DS.apple.fillTertiary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: DS.apple.separator,
  },
  assetUri: { flex: 1, fontSize: 12, color: DS.color.textMuted },
  segment: { flexDirection: 'row', gap: DS.space.sm },
  segBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: DS.apple.radiusField,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: DS.apple.separator,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DS.apple.fillTertiary,
  },
  segBtnOn: { borderColor: DS.color.gold, backgroundColor: DS.color.goldTint10 },
  segTxt: { fontFamily: DS.font.bodyMedium, color: DS.color.textMuted },
  segTxtOn: { color: DS.color.gold },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: DS.space.sm },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: DS.apple.radiusButton,
    backgroundColor: DS.apple.fillTertiary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: DS.apple.separator,
  },
  chipOn: { borderColor: DS.color.gold, backgroundColor: DS.color.goldTint10 },
  chipTxt: { fontFamily: DS.font.bodyMedium, fontSize: 13, color: DS.color.textMuted },
  chipTxtOn: { color: DS.color.gold },
  agendaRow: { flexDirection: 'row', gap: DS.space.sm, marginBottom: DS.space.sm },
  agendaTime: { width: 110 },
  agendaTitle: { flex: 1 },
  faqBlock: { gap: DS.space.sm, marginBottom: DS.space.md },
  gateBody: {
    flex: 1,
    padding: DS.space.xl,
    justifyContent: 'center',
    gap: DS.space.lg,
  },
  gateTitle: {
    fontFamily: DS.font.heading,
    fontSize: 28,
    color: DS.color.text,
    letterSpacing: 1,
  },
  gateTxt: { fontFamily: DS.font.body, fontSize: 15, color: DS.color.textMuted, lineHeight: 22 },
});
