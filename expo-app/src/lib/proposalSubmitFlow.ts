import { Alert } from 'react-native';
import type { ProposalKind } from '../roadmap/proposalService';
import {
  canSubmitContentProposal,
  contentProposalsUsedThisMonth,
  submitContentProposal,
} from '../roadmap/proposalService';

export type ProposalSubmitInput = {
  kind: ProposalKind;
  payload: Record<string, unknown>;
  attachmentUrls?: string[];
};

export type ProposalSubmitFlowResult =
  | { ok: true; id: string }
  | { ok: false; error: string; limitReached?: boolean };

/** Client-side monthly cap check + single submit (caller disables UI while pending). */
export async function runProposalSubmitFlow(
  input: ProposalSubmitInput,
): Promise<ProposalSubmitFlowResult> {
  const allowed = await canSubmitContentProposal();
  if (!allowed) {
    const used = await contentProposalsUsedThisMonth();
    return {
      ok: false,
      limitReached: true,
      error: `You have used ${used} of 3 proposals this month. Wait until next month to submit again.`,
    };
  }

  const result = await submitContentProposal(input);
  if (!result.ok) {
    const limitReached =
      result.error.includes('3') && result.error.toLowerCase().includes('month');
    return { ok: false, error: result.error, limitReached };
  }
  return { ok: true, id: result.id };
}

export function showProposalSubmittedAlert(onOk: () => void): void {
  Alert.alert(
    'Submitted for review',
    'Your proposal has been sent to the Dalton team. Please wait for a response — you cannot submit another copy of the same proposal here.',
    [{ text: 'OK', onPress: onOk }],
  );
}
