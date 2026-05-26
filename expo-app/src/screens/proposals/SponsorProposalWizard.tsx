import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../auth/AuthContext';
import { DS } from '../../designSystem';
import { uploadProposalAttachment } from '../../lib/proposalAttachmentUpload';
import type { SponsorsStackParamList } from '../../navigation/types';
import {
  canSubmitContentProposal,
  contentProposalsUsedThisMonth,
} from '../../roadmap/proposalService';
import {
  runProposalSubmitFlow,
  showProposalSubmittedAlert,
} from '../../lib/proposalSubmitFlow';
import { WizardChrome } from './WizardChrome';

type Props = NativeStackScreenProps<SponsorsStackParamList, 'SponsorProposalWizard'>;

export function SponsorProposalWizard({ navigation }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [brandName, setBrandName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [goals, setGoals] = useState('');
  const [attachments, setAttachments] = useState<{ name: string; uri: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usedThisMonth, setUsedThisMonth] = useState(0);
  const [allowed, setAllowed] = useState(true);

  useEffect(() => {
    void (async () => {
      const used = await contentProposalsUsedThisMonth();
      const ok = await canSubmitContentProposal();
      setUsedThisMonth(used);
      setAllowed(ok);
      if (!ok) {
        Alert.alert(
          'Monthly limit reached',
          'You can submit up to 3 proposals per calendar month (all types combined). Try again next month.',
          [{ text: 'OK', onPress: () => navigation.goBack() }],
        );
      }
    })();
  }, [navigation]);

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

  const submit = useCallback(async () => {
    if (!user?.id || submitted || submitting) return;
    setSubmitting(true);
    setError(null);
    const uploaded: string[] = [];
    for (const a of attachments) {
      const url = await uploadProposalAttachment(user.id, 'sponsor', a.uri, a.name);
      if (url) uploaded.push(url);
    }
    const result = await runProposalSubmitFlow({
      kind: 'sponsor',
      payload: {
        brand_name: brandName.trim(),
        contact_email: contactEmail.trim(),
        goals: goals.trim(),
      },
      attachmentUrls: uploaded,
    });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSubmitted(true);
    showProposalSubmittedAlert(() => navigation.goBack());
  }, [attachments, brandName, contactEmail, goals, navigation, submitted, submitting, user?.id]);

  if (!allowed) {
    return null;
  }

  if (step === 1) {
    return (
      <WizardChrome
        title="Sponsor proposal"
        step={1}
        totalSteps={4}
        onBack={() => navigation.goBack()}
        onNext={() => setStep(2)}
        nextDisabled={!brandName.trim() || !contactEmail.includes('@')}
      >
        <Text style={styles.quota}>
          {usedThisMonth}/3 sponsor proposals used this month
        </Text>
        <Text style={styles.lead}>Tell us who you represent — details come next.</Text>
        <Text style={styles.label}>Brand / organisation</Text>
        <TextInput style={styles.input} value={brandName} onChangeText={setBrandName} placeholder="Company name" placeholderTextColor={DS.color.textMuted} />
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
      </WizardChrome>
    );
  }

  if (step === 2) {
    return (
      <WizardChrome
        title="Sponsor proposal"
        step={2}
        totalSteps={4}
        onBack={() => setStep(1)}
        onNext={() => setStep(3)}
        nextDisabled={goals.trim().length < 30}
      >
        <Text style={styles.lead}>What are you looking to achieve with Dalton athletes?</Text>
        <TextInput
          style={[styles.input, styles.multi]}
          value={goals}
          onChangeText={setGoals}
          multiline
          placeholder="Audience, campaign goals, timing… (min 30 characters)"
          placeholderTextColor={DS.color.textMuted}
        />
      </WizardChrome>
    );
  }

  if (step === 3) {
    return (
      <WizardChrome title="Sponsor proposal" step={3} totalSteps={4} onBack={() => setStep(2)} onNext={() => setStep(4)} nextLabel="Review">
        <Text style={styles.lead}>Optional — pitch deck or one-pager (PDF).</Text>
        <Text style={styles.linkBtn} onPress={() => void pickDocs()}>
          + Attach proposal document
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
      title="Sponsor proposal"
      step={4}
      totalSteps={4}
      onBack={() => setStep(3)}
      onNext={() => void submit()}
      nextLabel={submitting ? 'Submitting…' : 'Submit for review'}
      nextDisabled={submitting || submitted}
      errorMessage={error}
    >
      <Text style={styles.reviewTitle}>{brandName}</Text>
      <Text style={styles.reviewMeta}>{contactEmail}</Text>
      <Text style={styles.reviewBody}>{goals}</Text>
      {attachments.length ? (
        <Text style={styles.reviewMeta}>{attachments.length} document(s) attached</Text>
      ) : null}
    </WizardChrome>
  );
}

const styles = StyleSheet.create({
  quota: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 13,
    color: DS.color.gold,
    marginBottom: DS.space.sm,
  },
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
});
