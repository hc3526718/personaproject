import { getSupabase } from '../lib/supabase';
import type { ConversationRow, MessageRow } from './types';

export type ConversationSummary = {
  conversation_id: string;
  peer_user_id: string;
  peer_display_name: string | null;
  peer_avatar_url: string | null;
  last_body: string | null;
  last_at: string | null;
};

/** Requires `get_or_create_dm` in backend/rpc_get_or_create_dm.sql + conversation RLS. */
export async function getOrCreateConversationId(peerUserId: string): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('get_or_create_dm', { other_user_id: peerUserId });
  if (error || data == null) return null;
  return typeof data === 'string' ? data : String(data);
}

export async function listConversationSummaries(userId: string): Promise<ConversationSummary[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data: mine, error: e1 } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', userId);
  if (e1 || !mine?.length) return [];
  const convIds = [...new Set(mine.map((m: { conversation_id: string }) => m.conversation_id))];
  const { data: allParts, error: e2 } = await supabase
    .from('conversation_participants')
    .select('conversation_id, user_id')
    .in('conversation_id', convIds);
  if (e2 || !allParts?.length) return [];

  const membersByConv = new Map<string, Set<string>>();
  for (const row of allParts as { conversation_id: string; user_id: string }[]) {
    if (!membersByConv.has(row.conversation_id)) membersByConv.set(row.conversation_id, new Set());
    membersByConv.get(row.conversation_id)!.add(row.user_id);
  }
  const peerByConv = new Map<string, string>();
  for (const [cid, users] of membersByConv) {
    if (users.size !== 2 || !users.has(userId)) continue;
    const [a, b] = [...users];
    peerByConv.set(cid, a === userId ? b : a);
  }

  const summaries: ConversationSummary[] = [];
  const peerIds = [...new Set(peerByConv.values())];
  const { data: profs } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .in('id', peerIds);
  const profMap = new Map(
    (profs ?? []).map((p: { id: string; display_name: string | null; avatar_url: string | null }) => [
      p.id,
      p,
    ]),
  );

  const { data: msgs } = await supabase
    .from('messages')
    .select('conversation_id, body, created_at')
    .in('conversation_id', convIds)
    .order('created_at', { ascending: false })
    .limit(300);

  const lastByConv = new Map<string, { body: string | null; created_at: string }>();
  for (const m of (msgs ?? []) as { conversation_id: string; body: string | null; created_at: string }[]) {
    if (!lastByConv.has(m.conversation_id)) {
      lastByConv.set(m.conversation_id, { body: m.body, created_at: m.created_at });
    }
  }

  for (const [conversationId, peerId] of peerByConv) {
    const pr = profMap.get(peerId);
    const last = lastByConv.get(conversationId);
    summaries.push({
      conversation_id: conversationId,
      peer_user_id: peerId,
      peer_display_name: pr?.display_name ?? null,
      peer_avatar_url: pr?.avatar_url ?? null,
      last_body: last?.body ?? null,
      last_at: last?.created_at ?? null,
    });
  }
  summaries.sort((a, b) => (b.last_at ?? '').localeCompare(a.last_at ?? ''));
  return summaries;
}

export async function listMyConversations(userId: string): Promise<ConversationRow[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const summaries = await listConversationSummaries(userId);
  return summaries.map((s) => ({
    id: s.conversation_id,
    created_at: s.last_at ?? new Date().toISOString(),
  }));
}

export async function listMessages(conversationId: string, limit = 50): Promise<MessageRow[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return [...(data as MessageRow[])].reverse();
}

export async function sendTextMessage(
  conversationId: string,
  senderId: string,
  body: string,
): Promise<MessageRow | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const trimmed = body.trim();
  if (!trimmed) return null;
  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: senderId, body: trimmed })
    .select('*')
    .single();
  if (error || !data) return null;
  return data as MessageRow;
}
