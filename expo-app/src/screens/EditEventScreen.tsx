import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FontAwesome } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../auth/AuthContext';
import { ScreenHeader } from '../components/ScreenHeader';
import { AppButton } from '../components/ui/AppButton';
import { DS } from '../designSystem';
import { endsAtAfterDuration } from '../lib/eventFormParse';
import { combineDateAndTime } from '../lib/scheduleValidation';
import type { EventsStackParamList } from '../navigation/types';
import { canCreateVerifiedContent } from '../creator/creatorAccess';
import { getEventById, updateCommunityEvent } from '../roadmap/liveDataService';
import type { EventRow } from '../roadmap/types';

type Props = NativeStackScreenProps<EventsStackParamList, 'EditEvent'>;

function parseFromDescription(desc?: string | null): { level?: string; cap?: string; tags?: string; duration?: string } {
  const txt = desc ?? '';
  const pick = (prefix: string) => {
    const m = txt.match(new RegExp(`^${prefix}\\s*:\\s*(.+)$`, 'mi'));
    return m?.[1]?.trim();
  };
  return {
    level: pick('Level'),
    cap: pick('Capacity'),
    tags: pick('Tags'),
    duration: pick('Duration'),
  };
}

export function EditEventScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ev, setEv] = useState<EventRow | null>(null);

  const [title, setTitle] = useState('');
  const [venue, setVenue] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [level, setLevel] = useState('All levels');
  const [capacity, setCapacity] = useState('');
  const [duration, setDuration] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const [time, setTime] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const allowed = canCreateVerifiedContent(false, user);

  useFocusEffect(
    useCallback(() => {
      if (!allowed) navigation.goBack();
    }, [allowed, navigation]),
  );

  useEffect(() => {
    let alive = true;
    setLoading(true);
    void (async () => {
      const row = await getEventById(route.params.eventId);
      if (!alive) return;
      setEv(row);
      if (!row) {
        setLoading(false);
        Alert.alert('Not found', 'This event could not be loaded.');
        navigation.goBack();
        return;
      }
      setTitle(row.title ?? '');
      setVenue(row.venue ?? '');
      setDescription(row.description ?? '');
      const parsed = parseFromDescription(row.description ?? '');
      if (parsed.tags) setTags(parsed.tags);
      if (parsed.level) setLevel(parsed.level);
      if (parsed.cap) setCapacity(parsed.cap);
      if (parsed.duration) setDuration(parsed.duration);
      const starts = new Date(row.starts_at);
      if (!Number.isNaN(starts.getTime())) {
        setDate(starts);
        setTime(starts);
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [navigation, route.params.eventId]);

  const scheduleLine = useMemo(() => {
    const d = date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    const t = time.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    return `${d} · ${t}${duration.trim() ? ` · ${duration.trim()}` : ''}`;
  }, [date, time, duration]);

  const onPickerChange = useCallback(
    (kind: 'date' | 'time', e: DateTimePickerEvent, selected?: Date) => {
      if (Platform.OS === 'android') {
        setShowDatePicker(false);
        setShowTimePicker(false);
      }
      if (e.type === 'dismissed' || !selected) return;
      if (kind === 'date') setDate(selected);
      else setTime(selected);
    },
    [],
  );

  const save = useCallback(async () => {
    if (!ev?.id || saving) return;
    if (!title.trim()) {
      Alert.alert('Missing title', 'Please enter an event title.');
      return;
    }
    if (description.trim().length < 20) {
      Alert.alert('Description too short', 'Please enter at least 20 characters.');
      return;
    }
    const cap = parseInt(capacity.replace(/\D/g, ''), 10);
    if (!capacity.trim() || Number.isNaN(cap) || cap < 1) {
      Alert.alert('Capacity', 'Please enter a valid capacity.');
      return;
    }

    const startsIso = combineDateAndTime(date, time).toISOString();
    const endsIso = endsAtAfterDuration(startsIso, duration.trim());

    // Keep the existing long-form description, but ensure key fields are present/updated.
    const base = description.trim();
    const parts = [
      base,
      '',
      `Level: ${level.trim() || 'All levels'}`,
      `Capacity: ${cap}`,
      `Tags: ${tags.trim() || '—'}`,
      duration.trim() ? `Duration: ${duration.trim()}` : '',
    ].filter(Boolean);
    const nextDesc = parts.join('\n');

    setSaving(true);
    const updated = await updateCommunityEvent(ev.id, {
      title: title.trim(),
      description: nextDesc,
      venue: venue.trim() || null,
      starts_at: startsIso,
      ends_at: endsIso,
    });
    setSaving(false);
    if (!updated) {
      Alert.alert('Could not save', 'Check permissions and try again.');
      return;
    }

    // Return to details and refresh by id.
    navigation.replace('EventDetails', { supabaseEventId: ev.id });
  }, [capacity, date, description, duration, ev?.id, level, navigation, saving, tags, time, title, venue]);

  return (
    <View style={styles.root}>
      <ScreenHeader title="Edit event" onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={[styles.pad, { paddingBottom: 32 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {loading ? <Text style={styles.muted}>Loading…</Text> : null}
        {!loading ? (
          <>
            <Text style={styles.kicker}>Schedule</Text>
            <View style={styles.card}>
              <Text style={styles.muted}>{scheduleLine}</Text>
              <View style={{ height: DS.space.md }} />
              <View style={styles.row}>
                <Pressable style={styles.pickerBtn} onPress={() => setShowDatePicker(true)}>
                  <FontAwesome name="calendar" size={16} color={DS.color.gold} />
                  <Text style={styles.pickerTxt}>Date</Text>
                </Pressable>
                <Pressable style={styles.pickerBtn} onPress={() => setShowTimePicker(true)}>
                  <FontAwesome name="clock-o" size={16} color={DS.color.gold} />
                  <Text style={styles.pickerTxt}>Time</Text>
                </Pressable>
              </View>
              {showDatePicker ? (
                <DateTimePicker
                  value={date}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(e, d) => onPickerChange('date', e, d)}
                />
              ) : null}
              {showTimePicker ? (
                <DateTimePicker
                  value={time}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(e, d) => onPickerChange('time', e, d)}
                />
              ) : null}
              <Text style={styles.label}>Duration (optional)</Text>
              <TextInput
                style={styles.input}
                value={duration}
                onChangeText={setDuration}
                placeholder="e.g. 2 hours"
                placeholderTextColor={DS.color.textMuted}
              />
            </View>

            <Text style={styles.kicker}>Details</Text>
            <View style={styles.card}>
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Event title"
                placeholderTextColor={DS.color.textMuted}
              />
              <Text style={styles.label}>Venue</Text>
              <TextInput
                style={styles.input}
                value={venue}
                onChangeText={setVenue}
                placeholder="Venue / location"
                placeholderTextColor={DS.color.textMuted}
              />
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.multi]}
                value={description}
                onChangeText={setDescription}
                placeholder="Description"
                placeholderTextColor={DS.color.textMuted}
                multiline
                textAlignVertical="top"
              />
              <Text style={styles.label}>Level</Text>
              <TextInput
                style={styles.input}
                value={level}
                onChangeText={setLevel}
                placeholder="All levels"
                placeholderTextColor={DS.color.textMuted}
              />
              <Text style={styles.label}>Capacity</Text>
              <TextInput
                style={styles.input}
                value={capacity}
                onChangeText={setCapacity}
                placeholder="e.g. 30"
                placeholderTextColor={DS.color.textMuted}
                keyboardType="number-pad"
              />
              <Text style={styles.label}>Tags</Text>
              <TextInput
                style={styles.input}
                value={tags}
                onChangeText={setTags}
                placeholder="comma-separated"
                placeholderTextColor={DS.color.textMuted}
              />
            </View>

            <AppButton label={saving ? 'Saving…' : 'Save changes'} onPress={() => void save()} disabled={saving} />
            <View style={{ height: DS.space.md }} />
            <AppButton label="Cancel" variant="secondary" onPress={() => navigation.goBack()} disabled={saving} />
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DS.color.background },
  pad: { padding: DS.space.lg },
  kicker: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 12,
    color: DS.color.textMuted,
    letterSpacing: 2,
    marginBottom: DS.space.sm,
    marginTop: DS.space.md,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: DS.color.surfaceAlt,
    borderRadius: DS.radius.xl,
    borderWidth: 1,
    borderColor: DS.color.borderHairline,
    padding: DS.space.base,
    marginBottom: DS.space.lg,
  },
  label: { fontSize: 12, color: DS.color.textMuted, marginBottom: 6, marginTop: DS.space.sm },
  input: {
    backgroundColor: DS.color.input,
    borderRadius: DS.radius.lg,
    padding: DS.space.md,
    color: DS.color.text,
    fontSize: 15,
  },
  multi: { minHeight: 120 },
  muted: { fontSize: 14, color: DS.color.textMuted, lineHeight: 20 },
  row: { flexDirection: 'row', gap: DS.space.md },
  pickerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.space.sm,
    backgroundColor: DS.color.surface,
    borderRadius: DS.radius.lg,
    padding: DS.space.md,
    borderWidth: 1,
    borderColor: DS.color.borderHairline,
    justifyContent: 'center',
  },
  pickerTxt: { fontSize: 14, fontWeight: '600', color: DS.color.text },
});

