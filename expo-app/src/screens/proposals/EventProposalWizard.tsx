import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../auth/AuthContext';
import { DS } from '../../designSystem';
import { uploadProposalAttachment } from '../../lib/proposalAttachmentUpload';
import type { EventsStackParamList } from '../../navigation/types';
import { submitContentProposal } from '../../roadmap/proposalService';
import { WizardChrome } from './WizardChrome';

type Props = NativeStackScreenProps<EventsStackParamList, 'EventProposalWizard'>;

const LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Elite', 'All levels'] as const;

export function EventProposalWizard({ navigation }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [pitch, setPitch] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [venue, setVenue] = useState('');
  const [level, setLevel] = useState<(typeof LEVELS)[number]>('All levels');
  const [attachments, setAttachments] = useState<{ name: string; uri: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const pickDocs = useCallback(async () => {
    const res = await DocumentPicker.getDocumentAsync({
      multiple: true,
      copyToCacheDirectory: true,
    });
    if (res.canceled) return;
    setAttachments((prev) => [
      ...prev,
      ...res.assets.map((a) => ({ name: a.name ?? 'file', uri: a.uri })),
    ]);
  }, []);

  const submit = useCallback(async () => {
    if (!user?.id) return;
    setSubmitting(true);
    const uploaded: string[] = [];
    for (const a of attachments) {
      const url = await uploadProposalAttachment(user.id, 'event', a.uri, a.name);
      if (url) uploaded.push(url);
    }
    const result = await submitContentProposal({
      kind: 'event',
      payload: {
        title: title.trim(),
        pitch: pitch.trim(),
        proposed_date: dateStr.trim(),
        venue: venue.trim(),
        level,
      },
      attachmentUrls: uploaded,
    });
    setSubmitting(false);
    if (!result.ok) {
      Alert.alert('Submission failed', result.error);
      return;
    }
    Alert.alert(
      'Proposal received',
      'The Dalton team will review your event proposal. You will be notified when it is approved.',
      [{ text: 'OK', onPress: () => navigation.goBack() }],
    );
  }, [attachments, dateStr, level, navigation, pitch, title, user?.id, venue]);

  if (step === 1) {
    return (
      <WizardChrome
        title="Event proposal"
        step={1}
        totalSteps={4}
        onBack={() => navigation.goBack()}
        onNext={() => setStep(2)}
        nextDisabled={!title.trim() || pitch.trim().length < 20}
      >
        <Text style={styles.lead}>Tell us about the event you want to host on Grant Access.</Text>
        <Text style={styles.label}>Event title</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Strength camp — spring session"
          placeholderTextColor={DS.color.textMuted}
        />
        <Text style={styles.label}>Summary</Text>
        <TextInput
          style={[styles.input, styles.multi]}
          value={pitch}
          onChangeText={setPitch}
          multiline
          textAlignVertical="top"
          placeholder="Who it is for, format, capacity, and why athletes should attend…"
          placeholderTextColor={DS.color.textMuted}
        />
      </WizardChrome>
    );
  }

  if (step === 2) {
    return (
      <WizardChrome
        title="Event proposal"
        step={2}
        totalSteps={4}
        onBack={() => setStep(1)}
        onNext={() => setStep(3)}
        nextDisabled={!dateStr.trim()}
      >
        <Text style={styles.label}>Proposed date</Text>
        <TextInput
          style={styles.input}
          value={dateStr}
          onChangeText={setDateStr}
          placeholder="YYYY-MM-DD or month + year"
          placeholderTextColor={DS.color.textMuted}
        />
        <Text style={styles.label}>Venue / location</Text>
        <TextInput
          style={styles.input}
          value={venue}
          onChangeText={setVenue}
          placeholder="City, facility, or online"
          placeholderTextColor={DS.color.textMuted}
        />
        <Text style={styles.label}>Level</Text>
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
      </WizardChrome>
    );
  }

  if (step === 3) {
    return (
      <WizardChrome
        title="Event proposal"
        step={3}
        totalSteps={4}
        onBack={() => setStep(2)}
        onNext={() => setStep(4)}
        nextLabel="Review"
      >
        <Text style={styles.lead}>Optional flyers, schedules, or briefs (PDF/images).</Text>
        <Pressable style={styles.attachBtn} onPress={() => void pickDocs()}>
          <Text style={styles.attachBtnTxt}>Add files</Text>
        </Pressable>
        {attachments.map((a) => (
          <Text key={a.uri} style={styles.fileRow}>
            {a.name}
          </Text>
        ))}
      </WizardChrome>
    );
  }

  return (
    <WizardChrome
      title="Event proposal"
      step={4}
      totalSteps={4}
      onBack={() => setStep(3)}
      onNext={() => void submit()}
      nextLabel={submitting ? 'Submitting…' : 'Submit proposal'}
      nextDisabled={submitting}
    >
      <Text style={styles.reviewTitle}>{title}</Text>
      <Text style={styles.reviewMeta}>
        {dateStr} · {venue || 'Venue TBC'} · {level}
      </Text>
      <Text style={styles.reviewBody}>{pitch}</Text>
      <Text style={styles.reviewHint}>
        {attachments.length} attachment{attachments.length === 1 ? '' : 's'} included.
      </Text>
    </WizardChrome>
  );
}

const styles = StyleSheet.create({
  lead: {
    fontFamily: DS.font.body,
    fontSize: 14,
    color: DS.color.textMuted,
    marginBottom: DS.space.lg,
    lineHeight: 20,
  },
  label: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 13,
    color: DS.color.gold,
    marginBottom: DS.space.xs,
    marginTop: DS.space.md,
  },
  input: {
    backgroundColor: DS.color.input,
    borderRadius: DS.radius.lg,
    paddingHorizontal: DS.space.md,
    paddingVertical: DS.space.md,
    color: DS.color.text,
    fontFamily: DS.font.body,
    fontSize: 15,
  },
  multi: { minHeight: 120 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: DS.space.sm, marginTop: DS.space.sm },
  chip: {
    paddingHorizontal: DS.space.md,
    paddingVertical: DS.space.sm,
    borderRadius: DS.radius.pill,
    borderWidth: 1,
    borderColor: DS.color.borderHairlineLight,
  },
  chipOn: { backgroundColor: DS.color.gold, borderColor: DS.color.gold },
  chipTxt: { color: DS.color.text, fontWeight: '600', fontSize: 13 },
  chipTxtOn: { color: DS.color.background },
  attachBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: DS.space.lg,
    paddingVertical: DS.space.sm,
    borderRadius: DS.radius.pill,
    borderWidth: 1,
    borderColor: DS.color.goldTint30,
  },
  attachBtnTxt: { color: DS.color.gold, fontFamily: DS.font.bodyMedium },
  fileRow: { color: DS.color.textMuted, fontSize: 13, marginTop: DS.space.sm },
  reviewTitle: {
    fontFamily: DS.font.heading,
    fontSize: 26,
    color: DS.color.text,
    letterSpacing: 0.5,
  },
  reviewMeta: {
    marginTop: DS.space.sm,
    color: DS.color.gold,
    fontFamily: DS.font.bodyMedium,
    fontSize: 13,
  },
  reviewBody: {
    marginTop: DS.space.lg,
    color: DS.color.textMuted,
    fontFamily: DS.font.body,
    fontSize: 15,
    lineHeight: 22,
  },
  reviewHint: { marginTop: DS.space.lg, color: DS.color.textMuted, fontSize: 13 },
});
