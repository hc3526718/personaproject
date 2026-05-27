import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FontAwesome } from '@expo/vector-icons';
import { useAuth } from '../../auth/AuthContext';
import { DS } from '../../designSystem';
import { uploadProposalAttachment } from '../../lib/proposalAttachmentUpload';
import { masterInstantPublish } from '../../lib/masterInstantPublish';
import type { SponsorsStackParamList } from '../../navigation/types';
import { WizardChrome } from './WizardChrome';

type Props = NativeStackScreenProps<SponsorsStackParamList, 'SponsorProposalWizard'>;

const TOTAL_STEPS = 5;

export function SponsorProposalWizard({ navigation }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [brandName, setBrandName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [goals, setGoals] = useState('');
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
      ...res.assets.map((a) => ({ name: a.name ?? 'proposal.pdf', uri: a.uri })),
    ]);
  }, []);

  const publish = useCallback(async () => {
    if (publishing || !user?.id) return;
    setPublishing(true);
    setError(null);
    const uploaded: string[] = [];
    for (const a of attachments) {
      const url = await uploadProposalAttachment(user.id, 'sponsor', a.uri, a.name);
      if (url) uploaded.push(url);
    }
    const result = await masterInstantPublish(
      user.id,
      'sponsor',
      {
        brand_name: brandName.trim(),
        contact_email: contactEmail.trim(),
        goals: goals.trim(),
      },
      uploaded,
    );
    setPublishing(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setConfirmTitle(brandName.trim());
    setStep(5);
  }, [attachments, brandName, contactEmail, goals, publishing, user?.id]);

  useEffect(() => {
    if (step !== 5 || !confirmTitle) return;
    const timer = setTimeout(() => {
      navigation.reset({
        index: 0,
        routes: [{ name: 'SponsorListings', params: { createdSponsorName: confirmTitle } }],
      });
    }, 2600);
    return () => clearTimeout(timer);
  }, [step, confirmTitle, navigation]);

  const chrome = (
    children: React.ReactNode,
    opts?: {
      nextLabel?: string;
      onNext?: () => void;
      hideNext?: boolean;
      nextDisabled?: boolean;
    },
  ) => (
    <WizardChrome
      title="Create sponsor"
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
        <Text style={styles.lead}>Partner page details — published live when you confirm.</Text>
        <Text style={styles.label}>Brand / organisation</Text>
        <TextInput
          style={styles.input}
          value={brandName}
          onChangeText={setBrandName}
          placeholder="Company name"
          placeholderTextColor={DS.color.textMuted}
        />
        <Text style={styles.label}>Contact email</Text>
        <TextInput
          style={styles.input}
          value={contactEmail}
          onChangeText={setContactEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="partnerships@brand.com"
          placeholderTextColor={DS.color.textMuted}
        />
      </>,
      { nextDisabled: !brandName.trim() || !contactEmail.includes('@') },
    );
  }

  if (step === 2) {
    return chrome(
      <>
        <Text style={styles.lead}>What are you offering Dalton athletes?</Text>
        <TextInput
          style={[styles.input, styles.multi]}
          value={goals}
          onChangeText={setGoals}
          multiline
          placeholder="Audience, campaign goals, timing… (min 30 characters)"
          placeholderTextColor={DS.color.textMuted}
        />
      </>,
      { nextDisabled: goals.trim().length < 30 },
    );
  }

  if (step === 3) {
    return chrome(
      <>
        <Text style={styles.lead}>Optional — pitch deck or one-pager (PDF).</Text>
        <Text style={styles.linkBtn} onPress={() => void pickDocs()}>
          + Attach document
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
        <Text style={styles.lead}>Review before publishing to the app.</Text>
        <Text style={styles.reviewTitle}>{brandName}</Text>
        <Text style={styles.reviewMeta}>{contactEmail}</Text>
        <Text style={styles.reviewBody}>{goals}</Text>
        {attachments.length ? (
          <Text style={styles.reviewMeta}>{attachments.length} document(s) attached</Text>
        ) : null}
      </>,
      {
        nextLabel: publishing ? 'Publishing…' : 'Create sponsor',
        onNext: () => void publish(),
      },
    );
  }

  return chrome(
    <>
      <View style={styles.confirmHero}>
        <FontAwesome name="check-circle" size={48} color={DS.color.gold} />
        <Text style={styles.confirmTitle}>Sponsor page live</Text>
        <Text style={styles.confirmSubtitle}>{confirmTitle}</Text>
      </View>
      <Text style={styles.confirmHint}>Taking you to Sponsors…</Text>
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
  multi: { minHeight: 120, textAlignVertical: 'top' },
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
