import { getSupabase } from '../lib/supabase';

export type ProposalKind = 'media' | 'sponsor' | 'event';
export type ProposalStatus = 'pending' | 'approved' | 'rejected' | 'needs_info';

export type ContentProposalRow = {
  id: string;
  author_id: string;
  kind: ProposalKind;
  status: ProposalStatus;
  payload: Record<string, unknown>;
  attachment_urls: string[];
  reviewer_notes: string | null;
  opened_at: string | null;
  opened_by: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  discussion_unlocked: boolean;
  created_at: string;
  updated_at: string;
  author_display_name?: string | null;
};

function mapRow(raw: Record<string, unknown>): ContentProposalRow {
  return {
    id: String(raw.id),
    author_id: String(raw.author_id),
    kind: raw.kind as ProposalKind,
    status: raw.status as ProposalStatus,
    payload: (raw.payload as Record<string, unknown>) ?? {},
    attachment_urls: Array.isArray(raw.attachment_urls) ? (raw.attachment_urls as string[]) : [],
    reviewer_notes: typeof raw.reviewer_notes === 'string' ? raw.reviewer_notes : null,
    opened_at: typeof raw.opened_at === 'string' ? raw.opened_at : null,
    opened_by: typeof raw.opened_by === 'string' ? raw.opened_by : null,
    reviewed_at: typeof raw.reviewed_at === 'string' ? raw.reviewed_at : null,
    reviewed_by: typeof raw.reviewed_by === 'string' ? raw.reviewed_by : null,
    discussion_unlocked: raw.discussion_unlocked === true,
    created_at: String(raw.created_at),
    updated_at: String(raw.updated_at),
    author_display_name:
      typeof (raw.profiles as { display_name?: string } | null)?.display_name === 'string'
        ? (raw.profiles as { display_name: string }).display_name
        : null,
  };
}

export async function getSponsorProposalsUsedThisMonth(): Promise<number> {
  const supabase = getSupabase();
  if (!supabase) return 0;
  const { data, error } = await supabase.rpc('sponsor_proposals_this_month_count');
  if (error || data == null) return 0;
  return Number(data) || 0;
}

export async function canSubmitSponsorProposal(): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  const { data, error } = await supabase.rpc('can_submit_sponsor_proposal');
  if (error) return false;
  return data === true;
}

export async function submitContentProposal(input: {
  kind: ProposalKind;
  payload: Record<string, unknown>;
  attachmentUrls?: string[];
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: 'Not connected.' };

  if (input.kind === 'sponsor') {
    const allowed = await canSubmitSponsorProposal();
    if (!allowed) {
      return {
        ok: false,
        error: 'You have reached the limit of 3 sponsor proposals this month.',
      };
    }
  }

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user?.id) return { ok: false, error: 'Sign in required.' };

  const { data, error } = await supabase
    .from('content_proposals')
    .insert({
      author_id: user.id,
      kind: input.kind,
      payload: input.payload,
      attachment_urls: input.attachmentUrls ?? [],
    })
    .select('id')
    .single();

  if (error || !data?.id) {
    const msg = error?.message ?? 'Could not submit proposal.';
    if (msg.includes('sponsor_monthly_limit')) {
      return { ok: false, error: 'Maximum 3 sponsor proposals per calendar month.' };
    }
    return { ok: false, error: msg };
  }
  return { ok: true, id: data.id as string };
}

export async function listMyProposals(): Promise<ContentProposalRow[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return [];

  const { data, error } = await supabase
    .from('content_proposals')
    .select('*')
    .eq('author_id', user.id)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data.map((r) => mapRow(r as Record<string, unknown>));
}

export async function listPendingProposalsForMaster(): Promise<ContentProposalRow[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('content_proposals')
    .select('*, profiles:author_id ( display_name )')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error || !data) return [];
  return data.map((r) => mapRow(r as Record<string, unknown>));
}

export async function fetchProposalById(id: string): Promise<ContentProposalRow | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('content_proposals')
    .select('*, profiles:author_id ( display_name )')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return null;
  return mapRow(data as Record<string, unknown>);
}

export async function masterOpenProposal(proposalId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: 'Not connected.' };
  const { error } = await supabase.rpc('master_open_content_proposal', {
    p_proposal_id: proposalId,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function masterReviewProposal(
  proposalId: string,
  decision: 'approved' | 'rejected',
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: 'Not connected.' };
  const { error } = await supabase.rpc('master_review_content_proposal', {
    p_proposal_id: proposalId,
    p_decision: decision,
  });
  if (error) {
    const msg = error.message;
    if (msg.includes('not_opened')) {
      return { ok: false, error: 'Open the proposal document before approving or rejecting.' };
    }
    if (msg.includes('already_reviewed')) {
      return { ok: false, error: 'This proposal has already been reviewed.' };
    }
    return { ok: false, error: msg };
  }
  return { ok: true };
}
