import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../auth/AuthContext';
import { DS } from '../../designSystem';
import { uploadProposalAttachment } from '../../lib/proposalAttachmentUpload';
import type { MediaStackParamList } from '../../navigation/types';
import {
  runProposalSubmitFlow,
  showProposalSubmittedAlert,
} from '../../lib/proposalSubmitFlow';
import { contentProposalsUsedThisMonth } from '../../roadmap/proposalService';
import { WizardChrome } from './WizardChrome';

type Props = NativeStackScreenProps<MediaStackParamList, 'MediaProposalWizard'>;

const CATEGORIES = ['Training', 'Mindset', 'Nutrition', 'Recovery', 'Career', 'Other'] as const;

export function MediaProposalWizard({ navigation }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [pitch, setPitch] = useState('');
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('Training');
  const [attachments, setAttachments] = useState<{ name: string; uri: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quotaHint, setQuotaHint] = useState('');

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

  useEffect(() => {
    void contentProposalsUsedThisMonth().then((n) => setQuotaHint(`${n}/3 proposals used this month`));
  }, []);

  const submit = useCallback(async () => {
    if (!user?.id || submitted || submitting) return;
    setSubmitting(true);
    setError(null);
    const uploaded: string[] = [];
    for (const a of attachments) {
      const url = await uploadProposalAttachment(user.id, 'media', a.uri, a.name);
      if (url) uploaded.push(url);
    }
    const result = await runProposalSubmitFlow(
      {
        kind: 'media',
        payload: { title: title.trim(), pitch: pitch.trim(), category },
        attachmentUrls: uploaded,
        localFiles: attachments.map((a) => ({ uri: a.uri, name: a.name })),
      },
      { masterControl: user.masterControl === true, userId: user.id },
    );
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSubmitted(true);
    showProposalSubmittedAlert(() => navigation.goBack(), {
      masterPublished: result.publishedLive,
    });
  }, [attachments, category, navigation, pitch, submitted, submitting, title, user?.id, user?.masterControl]);

  if (step === 1) {
    return (
      <WizardChrome
        title="Media proposal"
        step={1}
        totalSteps={4}
        onBack={() => navigation.goBack()}
        onNext={() => setStep(2)}
        nextDisabled={!title.trim() || pitch.trim().length < 20}
        errorMessage={error}
      >
        <Text style={styles.lead}>Start with the essentials — you can add files later.</Text>
        <Text style={styles.quota}>{quotaHint}</Text>
        <Text style={styles.label}>Title</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Series or episode title" placeholderTextColor={DS.color.textMuted} />
        <Text style={styles.label}>One-line pitch</Text>
        <TextInput
          style={[styles.input, styles.multi]}
          value={pitch}
          onChangeText={setPitch}
          multiline
          placeholder="What will athletes learn? (min 20 characters)"
          placeholderTextColor={DS.color.textMuted}
        />
      </WizardChrome>
    );
  }

  if (step === 2) {
    return (
      <WizardChrome title="Media proposal" step={2} totalSteps={4} onBack={() => setStep(1)} onNext={() => setStep(3)}>
        <Text style={styles.lead}>Choose the closest category.</Text>
        <View style={styles.chips}>
          {CATEGORIES.map((c) => (
            <Pressable key={c} onPress={() => setCategory(c)} style={[styles.chip, category === c && styles.chipOn]}>
              <Text style={[styles.chipText, category === c && styles.chipTextOn]}>{c}</Text>
            </Pressable>
          ))}
        </View>
      </WizardChrome>
    );
  }

  if (step === 3) {
    return (
      <WizardChrome title="Media proposal" step={3} totalSteps={4} onBack={() => setStep(2)} onNext={() => setStep(4)} nextLabel="Review">
        <Text style={styles.lead}>Optional — treatment notes, storyboard, or sample clip links.</Text>
        <Text style={styles.linkBtn} onPress={() => void pickDocs()}>
          + Add supplementary files
        </Text>
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
      title="Media proposal"
      step={4}
      totalSteps={4}
      onBack={() => setStep(3)}
      onNext={() => void submit()}
      nextLabel={submitting ? 'Submitting…' : 'Submit for review'}
      nextDisabled={submitting || submitted}
      errorMessage={error}
    >
      <Text style={styles.reviewTitle}>{title}</Text>
      <Text style={styles.reviewMeta}>{category}</Text>
      <Text style={styles.reviewBody}>{pitch}</Text>
      {attachments.length ? (
        <Text style={styles.reviewMeta}>{attachments.length} attachment(s)</Text>
      ) : null}
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
  quota: {
    fontFamily: DS.font.body,
    fontSize: 12,
    color: DS.color.gold,
    marginBottom: DS.space.md,
  },
  label: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 13,
    color: DS.color.screenTitle,
    marginBottom: DS.space.xs,
  },
  input: {
    backgroundColor: DS.color.input,
    borderRadius: DS.radius.lg,
    padding: DS.space.md,
    color: DS.color.text,
    fontFamily: DS.font.body,
    fontSize: 15,
    marginBottom: DS.space.md,
  },
  multi: { minHeight: 100, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: DS.space.sm },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: DS.color.input,
  },
  chipOn: {
    backgroundColor: DS.color.gold,
  },
  chipText: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 13,
    color: DS.color.white,
  },
  chipTextOn: {
    color: DS.color.background,
    fontWeight: '700',
  },
  linkBtn: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 15,
    color: DS.color.gold,
    marginBottom: DS.space.md,
  },
  fileRow: {
    fontFamily: DS.font.body,
    fontSize: 13,
    color: DS.color.textMuted,
    marginBottom: 4,
  },
  reviewTitle: {
    fontFamily: DS.font.heading,
    fontSize: 26,
    color: DS.color.white,
    marginBottom: DS.space.sm,
  },
  reviewMeta: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 14,
    color: DS.color.gold,
    marginBottom: DS.space.sm,
  },
  reviewBody: {
    fontFamily: DS.font.body,
    fontSize: 15,
    color: DS.color.text,
    lineHeight: 22,
  },
});
