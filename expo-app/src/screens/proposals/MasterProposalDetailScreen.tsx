import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FontAwesome } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppLoadingIndicator } from '../../components/AppLoadingIndicator';
import { ScreenHeader } from '../../components/ScreenHeader';
import { DS } from '../../designSystem';
import type { ProfileStackParamList } from '../../navigation/types';
import {
  fetchProposalById,
  masterOpenProposal,
  masterReviewProposal,
  type ContentProposalRow,
} from '../../roadmap/proposalService';

type Props = NativeStackScreenProps<ProfileStackParamList, 'MasterProposalDetail'>;

export function MasterProposalDetailScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const proposalId = route.params.proposalId;
  const [row, setRow] = useState<ContentProposalRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [documentOpened, setDocumentOpened] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    const p = await fetchProposalById(proposalId);
    setRow(p);
    setDocumentOpened(Boolean(p?.opened_at));
    setLoading(false);
  }, [proposalId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const openDocument = useCallback(async () => {
    const urls = row?.attachment_urls ?? [];
    if (urls.length === 0) {
      const opened = await masterOpenProposal(proposalId);
      if (!opened.ok) {
        Alert.alert('Could not open', opened.error);
        return;
      }
      setDocumentOpened(true);
      await reload();
      Alert.alert(
        'Proposal opened',
        'No attachment files were included. You may now approve or reject based on the summary below.',
      );
      return;
    }
    const url = urls[0]!;
    const can = await Linking.canOpenURL(url);
    if (!can) {
      Alert.alert('Cannot open', url);
      return;
    }
    const opened = await masterOpenProposal(proposalId);
    if (!opened.ok) {
      Alert.alert('Could not record open', opened.error);
      return;
    }
    setDocumentOpened(true);
    await Linking.openURL(url);
    await reload();
  }, [proposalId, reload, row?.attachment_urls]);

  const decide = useCallback(
    async (decision: 'approved' | 'rejected') => {
      if (!documentOpened) {
        Alert.alert('Open document first', 'Review the submitted document before deciding.');
        return;
      }
      setReviewing(true);
      const res = await masterReviewProposal(proposalId, decision);
      setReviewing(false);
      if (!res.ok) {
        Alert.alert('Review failed', res.error);
        return;
      }
      Alert.alert(
        decision === 'approved' ? 'Approved' : 'Rejected',
        decision === 'approved' && row?.kind === 'sponsor'
          ? 'The applicant can continue the conversation in Messages.'
          : 'Decision saved. This proposal cannot be changed.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    },
    [documentOpened, navigation, proposalId, row?.kind],
  );

  if (loading || !row) {
    return (
      <View style={styles.root}>
        <ScreenHeader title="Proposal" onBack={() => navigation.goBack()} />
        <AppLoadingIndicator style={{ marginTop: DS.space.xl }} />
      </View>
    );
  }

  const canDecide = row.status === 'pending' && documentOpened;

  return (
    <View style={styles.root}>
      <ScreenHeader title="Proposal detail" onBack={() => navigation.goBack()} largeTitle />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.kind}>{row.kind.toUpperCase()} · {row.status}</Text>
        <Text style={styles.author}>{row.author_display_name ?? 'Member'}</Text>

        {Object.entries(row.payload).map(([k, v]) => (
          <View key={k} style={styles.field}>
            <Text style={styles.fieldLabel}>{k.replace(/_/g, ' ')}</Text>
            <Text style={styles.fieldValue}>{String(v)}</Text>
          </View>
        ))}

        <Pressable style={styles.openDocBtn} onPress={() => void openDocument()}>
          <FontAwesome name="file-text-o" size={18} color={DS.color.background} />
          <Text style={styles.openDocTxt}>
            {documentOpened ? 'Re-open submitted document' : 'Open submitted document'}
          </Text>
        </Pressable>

        {!documentOpened ? (
          <Text style={styles.hint}>
            Approve ✓ and Reject ✗ unlock after you open the applicant&apos;s document.
          </Text>
        ) : null}

        {row.status !== 'pending' ? (
          <Text style={styles.decided}>
            Reviewed {row.reviewed_at ? new Date(row.reviewed_at).toLocaleString() : ''} — decision
            is final.
          </Text>
        ) : null}
      </ScrollView>

      {row.status === 'pending' ? (
        <View style={[styles.actions, { paddingBottom: insets.bottom + DS.space.md }]}>
          <Pressable
            style={[styles.rejectBtn, (!canDecide || reviewing) && styles.btnDisabled]}
            disabled={!canDecide || reviewing}
            onPress={() => void decide('rejected')}
          >
            <FontAwesome name="times" size={22} color={DS.color.white} />
          </Pressable>
          <Pressable
            style={[styles.approveBtn, (!canDecide || reviewing) && styles.btnDisabled]}
            disabled={!canDecide || reviewing}
            onPress={() => void decide('approved')}
          >
            <FontAwesome name="check" size={22} color={DS.color.background} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DS.color.background },
  scroll: { paddingHorizontal: DS.space.base, paddingTop: DS.space.md },
  kind: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 12,
    color: DS.color.gold,
    letterSpacing: 1,
  },
  author: {
    fontFamily: DS.font.body,
    fontSize: 14,
    color: DS.color.textMuted,
    marginBottom: DS.space.lg,
  },
  field: { marginBottom: DS.space.md },
  fieldLabel: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 12,
    color: DS.color.textMuted,
    textTransform: 'capitalize',
  },
  fieldValue: {
    fontFamily: DS.font.body,
    fontSize: 15,
    color: DS.color.text,
    lineHeight: 22,
  },
  openDocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: DS.space.sm,
    backgroundColor: DS.color.gold,
    paddingVertical: 14,
    borderRadius: DS.radius.xl,
    marginTop: DS.space.md,
  },
  openDocTxt: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 15,
    fontWeight: '700',
    color: DS.color.background,
  },
  hint: {
    fontFamily: DS.font.body,
    fontSize: 13,
    color: DS.color.textMuted,
    marginTop: DS.space.md,
    lineHeight: 19,
  },
  decided: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 14,
    color: DS.color.gold,
    marginTop: DS.space.lg,
  },
  actions: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: DS.space.xl,
    paddingTop: DS.space.md,
    backgroundColor: DS.color.overlayDark80,
  },
  approveBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: DS.color.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: DS.color.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.35 },
});
