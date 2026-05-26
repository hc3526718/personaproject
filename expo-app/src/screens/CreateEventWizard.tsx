import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FontAwesome } from '@expo/vector-icons';
import { useAuth } from '../auth/AuthContext';
import { FormField } from '../components/ui/FormField';
import { DS } from '../designSystem';
import { useWizardBack } from '../hooks/useWizardBack';
import { endsAtAfterDuration, parseEventStartIso } from '../lib/eventFormParse';
import { getSupabase } from '../lib/supabase';
import { pickWebMediaFile } from '../lib/webFilePicker';
import type { EventsStackParamList } from '../navigation/types';
import { insertCommunityEvent } from '../roadmap/liveDataService';
import { WizardChrome } from './proposals/WizardChrome';

type Props = Pick<NativeStackScreenProps<EventsStackParamList, 'CreateEvent'>, 'navigation'>;

type AssetItem = { uri: string; kind: 'image' | 'video' };
const LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Elite', 'All levels'] as const;
const DESC_MIN = 100;
const TOTAL_STEPS = 5;

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

export function CreateEventWizard({ navigation }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

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

  const goBack = useWizardBack(step, setStep, () => navigation.goBack());

  const sortedAssets = useMemo(
    () => [...assets].sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'image' ? -1 : 1)),
    [assets],
  );

  const pickImages = useCallback(async () => {
    if (Platform.OS === 'web') {
      const picked = await pickWebMediaFile('image');
      if (picked?.uri) setAssets((prev) => [...prev, { uri: picked.uri, kind: 'image' }]);
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
      const picked = await pickWebMediaFile('video');
      if (picked?.uri) setAssets((prev) => [...prev, { uri: picked.uri, kind: 'video' }]);
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], quality: 1 });
    if (res.canceled || !res.assets[0]?.uri) return;
    setAssets((prev) => [...prev, { uri: res.assets[0].uri, kind: 'video' }]);
  }, []);

  const removeAsset = useCallback((uri: string) => {
    setAssets((prev) => prev.filter((x) => x.uri !== uri));
  }, []);

  const validateStep = useCallback(
    (s: number): string | null => {
      if (s === 1) {
        if (!eventTitle.trim()) return 'Event title is required.';
      }
      if (s === 2) {
        if (description.trim().length < DESC_MIN) {
          return `Description must be at least ${DESC_MIN} characters.`;
        }
      }
      if (s === 3) {
        if (!dateStr.trim() || !timeStr.trim()) return 'Date and time are required.';
        if (!costFree) {
          const n = parseFloat(price.replace(/[^0-9.]/g, ''));
          if (!price.trim() || Number.isNaN(n) || n < 0) return 'Enter a valid price for paid events.';
        }
      }
      if (s === 4) {
        const completeAgenda = agenda.filter((row) => row.title.trim() && row.time.trim());
        const partialAgenda = agenda.some(
          (row) => (row.title.trim() || row.time.trim()) && !(row.title.trim() && row.time.trim()),
        );
        if (completeAgenda.length === 0) return 'Add at least one agenda item with title and time.';
        if (partialAgenda) return 'Finish incomplete agenda rows or clear them.';
      }
      return null;
    },
    [eventTitle, description, dateStr, timeStr, costFree, price, agenda],
  );

  const nextStep = () => {
    const err = validateStep(step);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    if (step < TOTAL_STEPS) setStep(step + 1);
    else void publish();
  };

  const publish = useCallback(() => {
    if (publishing || !user?.id || user.id.startsWith('demo-')) return;
    const completeAgenda = agenda.filter((row) => row.title.trim() && row.time.trim());
    const starts = parseEventStartIso(dateStr, timeStr);
    if (!starts) {
      setError('Use YYYY-MM-DD for the date and a time like 10:00 AM or 14:30.');
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
    if (faqLines.length > 0) descParts.push('', 'FAQs:', ...faqLines);
    descParts.push('', `What to bring: ${bring.trim() || '—'}`);
    const longDesc = descParts.join('\n');

    setPublishing(true);
    void (async () => {
      let hero: string | null = null;
      if (firstImage?.uri) {
        hero = /^https?:\/\//i.test(firstImage.uri)
          ? firstImage.uri
          : await uploadEventHero(user.id, firstImage.uri);
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
        setError('Could not publish. Check your connection and permissions.');
        return;
      }
      Alert.alert('Event published', row.title, [{ text: 'OK', onPress: () => navigation.goBack() }]);
    })();
  }, [
    publishing,
    user?.id,
    agenda,
    dateStr,
    timeStr,
    duration,
    description,
    level,
    eventTags,
    faqs,
    bring,
    sortedAssets,
    eventTitle,
    costFree,
    navigation,
  ]);

  const chrome = (children: import('react').ReactNode, nextLabel?: string) => (
    <WizardChrome
      title="Create event"
      step={step}
      totalSteps={TOTAL_STEPS}
      onBack={goBack}
      onNext={nextStep}
      nextLabel={nextLabel ?? (step === TOTAL_STEPS ? (publishing ? 'Publishing…' : 'Publish event') : 'Continue')}
      nextDisabled={publishing}
      errorMessage={error}
    >
      {children}
    </WizardChrome>
  );

  if (step === 1) {
    return chrome(
      <>
        <Text style={s.lead}>Cover image first, then optional video.</Text>
        <View style={s.assetActions}>
          <Pressable style={s.pickBtn} onPress={() => void pickImages()}>
            <FontAwesome name="image" size={14} color={DS.color.gold} />
            <Text style={s.pickTxt}> Add images</Text>
          </Pressable>
          <Pressable style={s.pickBtn} onPress={() => void pickVideos()}>
            <FontAwesome name="video-camera" size={14} color={DS.color.gold} />
            <Text style={s.pickTxt}> Add video</Text>
          </Pressable>
        </View>
        {sortedAssets.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: DS.space.md }}>
            {sortedAssets.map((a) => (
              <View key={a.uri} style={s.thumbWrap}>
                {a.kind === 'image' ? (
                  <Image source={{ uri: a.uri }} style={s.thumb} />
                ) : (
                  <View style={[s.thumb, s.thumbVid]}>
                    <FontAwesome name="video-camera" size={20} color={DS.color.gold} />
                  </View>
                )}
                <Pressable style={s.thumbRemove} onPress={() => removeAsset(a.uri)}>
                  <FontAwesome name="times" size={10} color={DS.color.background} />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        ) : null}
        <FormField label="Event title" required>
          <TextInput
            value={eventTitle}
            onChangeText={setEventTitle}
            placeholder="Strength camp — spring session"
            placeholderTextColor={DS.color.textMuted}
            style={s.input}
          />
        </FormField>
      </>,
    );
  }

  if (step === 2) {
    return chrome(
      <>
        <Text style={s.lead}>Describe the session and who it is for.</Text>
        <FormField
          label="Description"
          required
          hint={`Minimum ${DESC_MIN} characters (${description.trim().length}/${DESC_MIN})`}
        >
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Format, safety, cancellation policy…"
            placeholderTextColor={DS.color.textMuted}
            style={[s.input, s.inputMulti]}
            multiline
            textAlignVertical="top"
          />
        </FormField>
        <FormField label="Event tags" hint="Optional — comma-separated.">
          <TextInput
            value={eventTags}
            onChangeText={setEventTags}
            placeholder="strength, conditioning"
            placeholderTextColor={DS.color.textMuted}
            style={s.input}
          />
        </FormField>
        <FormField label="Level" required>
          <View style={s.chipWrap}>
            {LEVELS.map((lv) => (
              <Pressable
                key={lv}
                onPress={() => setLevel(lv)}
                style={[s.chip, level === lv && s.chipOn]}
              >
                <Text style={[s.chipTxt, level === lv && s.chipTxtOn]}>{lv}</Text>
              </Pressable>
            ))}
          </View>
        </FormField>
      </>,
    );
  }

  if (step === 3) {
    return chrome(
      <>
        <Text style={s.lead}>When does your event run?</Text>
        <FormField label="Date" required>
          <TextInput
            value={dateStr}
            onChangeText={setDateStr}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={DS.color.textMuted}
            style={s.input}
          />
        </FormField>
        <FormField label="Time" required>
          <TextInput
            value={timeStr}
            onChangeText={setTimeStr}
            placeholder="e.g. 10:00 AM"
            placeholderTextColor={DS.color.textMuted}
            style={s.input}
          />
        </FormField>
        <FormField label="Duration" hint="Optional — e.g. 2 hours">
          <TextInput
            value={duration}
            onChangeText={setDuration}
            placeholder="2 hours"
            placeholderTextColor={DS.color.textMuted}
            style={s.input}
          />
        </FormField>
        <FormField label="Cost" required>
          <View style={s.segment}>
            <Pressable onPress={() => setCostFree(true)} style={[s.segBtn, costFree && s.segBtnOn]}>
              <Text style={[s.segTxt, costFree && s.segTxtOn]}>Free</Text>
            </Pressable>
            <Pressable onPress={() => setCostFree(false)} style={[s.segBtn, !costFree && s.segBtnOn]}>
              <Text style={[s.segTxt, !costFree && s.segTxtOn]}>Paid</Text>
            </Pressable>
          </View>
          {!costFree ? (
            <TextInput
              value={price}
              onChangeText={setPrice}
              placeholder="Amount in USD"
              placeholderTextColor={DS.color.textMuted}
              keyboardType="decimal-pad"
              style={[s.input, { marginTop: DS.space.md }]}
            />
          ) : null}
        </FormField>
      </>,
    );
  }

  if (step === 4) {
    return chrome(
      <>
        <Text style={s.lead}>Agenda, FAQs, and what attendees should bring.</Text>
        <Text style={s.sectionLabel}>Agenda *</Text>
        {agenda.map((row, i) => (
          <View key={i} style={s.agendaRow}>
            <TextInput
              value={row.time}
              onChangeText={(t) =>
                setAgenda((rows) => rows.map((r, j) => (j === i ? { ...r, time: t } : r)))
              }
              placeholder="10:00 AM"
              placeholderTextColor={DS.color.textMuted}
              style={[s.input, s.agendaTime]}
            />
            <TextInput
              value={row.title}
              onChangeText={(t) =>
                setAgenda((rows) => rows.map((r, j) => (j === i ? { ...r, title: t } : r)))
              }
              placeholder="Session title"
              placeholderTextColor={DS.color.textMuted}
              style={[s.input, s.agendaTitle]}
            />
          </View>
        ))}
        <Pressable onPress={() => setAgenda((r) => [...r, { title: '', time: '' }])} style={s.ghostBtn}>
          <Text style={s.ghostTxt}>+ Add agenda row</Text>
        </Pressable>
        <Text style={[s.sectionLabel, { marginTop: DS.space.lg }]}>FAQs (optional)</Text>
        {faqs.map((f, i) => (
          <View key={i} style={{ marginBottom: DS.space.sm }}>
            <TextInput
              value={f.q}
              onChangeText={(t) =>
                setFaqs((rows) => rows.map((r, j) => (j === i ? { ...r, q: t } : r)))
              }
              placeholder="Question"
              placeholderTextColor={DS.color.textMuted}
              style={s.input}
            />
            <TextInput
              value={f.a}
              onChangeText={(t) =>
                setFaqs((rows) => rows.map((r, j) => (j === i ? { ...r, a: t } : r)))
              }
              placeholder="Answer"
              placeholderTextColor={DS.color.textMuted}
              style={[s.input, s.inputMulti, { minHeight: 72, marginTop: DS.space.sm }]}
              multiline
            />
          </View>
        ))}
        <Pressable onPress={() => setFaqs((r) => [...r, { q: '', a: '' }])} style={s.ghostBtn}>
          <Text style={s.ghostTxt}>+ Add FAQ</Text>
        </Pressable>
        <FormField label="What to bring" hint="Optional">
          <TextInput
            value={bring}
            onChangeText={setBring}
            placeholder="Water bottle, towel"
            placeholderTextColor={DS.color.textMuted}
            style={[s.input, { marginTop: DS.space.md }]}
          />
        </FormField>
      </>,
      'Review',
    );
  }

  return chrome(
    <>
      <Text style={s.lead}>Review before publishing.</Text>
      <Text style={s.reviewLabel}>Title</Text>
      <Text style={s.reviewVal}>{eventTitle.trim() || '—'}</Text>
      <Text style={s.reviewLabel}>Schedule</Text>
      <Text style={s.reviewVal}>
        {dateStr} · {timeStr}
        {duration.trim() ? ` · ${duration}` : ''}
      </Text>
      <Text style={s.reviewLabel}>Cost</Text>
      <Text style={s.reviewVal}>{costFree ? 'Free' : `$${price}`}</Text>
      <Text style={s.reviewLabel}>Level</Text>
      <Text style={s.reviewVal}>{level}</Text>
      <Text style={s.reviewLabel}>Media</Text>
      <Text style={s.reviewVal}>{sortedAssets.length} file(s)</Text>
    </>,
  );
}

const s = StyleSheet.create({
  lead: {
    fontFamily: DS.font.body,
    fontSize: 14,
    color: DS.color.textMuted,
    marginBottom: DS.space.md,
    lineHeight: 20,
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
  assetActions: { flexDirection: 'row', gap: DS.space.sm, marginBottom: DS.space.md },
  pickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: DS.space.md,
    borderRadius: DS.radius.lg,
    borderWidth: 1,
    borderColor: DS.color.goldTint30,
  },
  pickTxt: { fontFamily: DS.font.bodyMedium, fontSize: 14, color: DS.color.gold },
  thumbWrap: { marginRight: DS.space.sm, position: 'relative' },
  thumb: { width: 72, height: 72, borderRadius: DS.radius.md },
  thumbVid: {
    backgroundColor: DS.apple.fillTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: DS.color.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  sectionLabel: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 13,
    color: DS.color.textMuted,
    marginBottom: DS.space.sm,
  },
  agendaRow: { flexDirection: 'row', gap: DS.space.sm, marginBottom: DS.space.sm },
  agendaTime: { width: 110 },
  agendaTitle: { flex: 1 },
  ghostBtn: { paddingVertical: DS.space.sm, marginBottom: DS.space.md },
  ghostTxt: { fontFamily: DS.font.bodyMedium, fontSize: 14, color: DS.color.gold },
  reviewLabel: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 12,
    color: DS.color.textMuted,
    marginTop: DS.space.md,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  reviewVal: { fontFamily: DS.font.body, fontSize: 15, color: DS.color.text },
});
