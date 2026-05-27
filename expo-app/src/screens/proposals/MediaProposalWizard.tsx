import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FontAwesome } from '@expo/vector-icons';
import { useAuth } from '../../auth/AuthContext';
import { DS } from '../../designSystem';
import { uploadProposalAttachment } from '../../lib/proposalAttachmentUpload';
import { masterInstantPublish } from '../../lib/masterInstantPublish';
import type { MediaStackParamList } from '../../navigation/types';
import { WizardChrome } from './WizardChrome';

type Props = NativeStackScreenProps<MediaStackParamList, 'MediaProposalWizard'>;

const CATEGORIES = ['Training', 'Mindset', 'Nutrition', 'Recovery', 'Career', 'Other'] as const;
const TOTAL_STEPS = 5;

export function MediaProposalWizard({ navigation }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [pitch, setPitch] = useState('');
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('Training');
  const [attachments, setAttachments] = useState<{ name: string; uri: string }[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmTitle, setConfirmTitle] = useState<string | null>(null);

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

  const publish = useCallback(async () => {
    if (publishing || !user?.id) return;
    setPublishing(true);
    setError(null);
    const uploaded: string[] = [];
    for (const a of attachments) {
      const url = await uploadProposalAttachment(user.id, 'media', a.uri, a.name);
      if (url) uploaded.push(url);
    }
    const result = await masterInstantPublish(
      user.id,
      'media',
      { title: title.trim(), pitch: pitch.trim(), category },
      uploaded,
      attachments.map((a) => ({ uri: a.uri, name: a.name })),
    );
    setPublishing(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setConfirmTitle(title.trim());
    setStep(5);
  }, [attachments, category, pitch, publishing, title, user?.id]);

  useEffect(() => {
    if (step !== 5 || !confirmTitle) return;
    const timer = setTimeout(() => {
      navigation.reset({
        index: 0,
        routes: [{ name: 'MediaLibrary', params: { createdMediaTitle: confirmTitle } }],
      });
    }, 2600);
    return () => clearTimeout(timer);
  }, [step, confirmTitle, navigation]);

  const chrome = (
    children: React.ReactNode,
    opts?: { nextLabel?: string; onNext?: () => void; hideNext?: boolean; nextDisabled?: boolean },
  ) => (
    <WizardChrome
      title="Create media"
      step={step}
      totalSteps={TOTAL_STEPS}
      onBack={() => (step > 1 ? setStep(step - 1) : navigation.goBack())}
      onNext={opts?.hideNext ? undefined : opts?.onNext ?? (() => setStep(step + 1))}
      nextLabel={opts?.nextLabel}
      nextDisabled={publishing || opts?.nextDisabled}
      errorMessage={error}
    >
      {children}
    </WizardChrome>
  );

  if (step === 1) {
    return chrome(
      <>
        <Text style={styles.lead}>Published live in the media library when you confirm.</Text>
        <Text style={styles.label}>Title</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Series or episode title"
          placeholderTextColor={DS.color.textMuted}
        />
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.multi]}
          value={pitch}
          onChangeText={setPitch}
          multiline
          placeholder="What will athletes learn? (min 20 characters)"
          placeholderTextColor={DS.color.textMuted}
        />
      </>,
      { nextDisabled: !title.trim() || pitch.trim().length < 20 },
    );
  }

  if (step === 2) {
    return chrome(
      <>
        <Text style={styles.lead}>Choose the closest category.</Text>
        <View style={styles.chips}>
          {CATEGORIES.map((c) => (
            <Pressable
              key={c}
              onPress={() => setCategory(c)}
              style={[styles.chip, category === c && styles.chipOn]}
            >
              <Text style={[styles.chipText, category === c && styles.chipTextOn]}>{c}</Text>
            </Pressable>
          ))}
        </View>
      </>,
    );
  }

  if (step === 3) {
    return chrome(
      <>
        <Text style={styles.lead}>Upload media files (images, video, or documents).</Text>
        <Text style={styles.linkBtn} onPress={() => void pickDocs()}>
          + Add files
        </Text>
        {attachments.map((a) => (
          <Text key={a.uri} style={styles.fileRow}>
            {a.name}
          </Text>
        ))}
      </>,
      { nextLabel: 'Review' },
    );
  }

  if (step === 4) {
    return chrome(
      <>
        <Text style={styles.lead}>Review before publishing.</Text>
        <Text style={styles.reviewTitle}>{title}</Text>
        <Text style={styles.reviewMeta}>{category}</Text>
        <Text style={styles.reviewBody}>{pitch}</Text>
        {attachments.length ? (
          <Text style={styles.reviewMeta}>{attachments.length} file(s) attached</Text>
        ) : null}
      </>,
      {
        nextLabel: publishing ? 'Publishing…' : 'Create media',
        onNext: () => void publish(),
      },
    );
  }

  return chrome(
    <>
      <View style={styles.confirmHero}>
        <FontAwesome name="check-circle" size={48} color={DS.color.gold} />
        <Text style={styles.confirmTitle}>Media published</Text>
        <Text style={styles.confirmSubtitle}>{confirmTitle}</Text>
      </View>
      <Text style={styles.confirmHint}>Taking you to Media…</Text>
    </>,
    { hideNext: true },
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
  chipOn: { backgroundColor: DS.color.gold },
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
  confirmHero: { alignItems: 'center', marginTop: DS.space.lg, marginBottom: DS.space.lg },
  confirmTitle: {
    fontFamily: DS.font.heading,
    fontSize: 24,
    color: DS.color.text,
    marginTop: DS.space.md,
  },
  confirmSubtitle: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 16,
    color: DS.color.gold,
    marginTop: DS.space.sm,
    textAlign: 'center',
  },
  confirmHint: {
    fontFamily: DS.font.body,
    fontSize: 13,
    color: DS.color.textMuted,
    textAlign: 'center',
    marginTop: DS.space.xl,
  },
});
