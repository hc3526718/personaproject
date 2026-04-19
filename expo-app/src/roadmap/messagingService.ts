import { getSupabase } from '../lib/supabase';
import type { ConversationRow, MessageRow } from './types';

export async function listMyConversations(_userId: string): Promise<ConversationRow[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  // TODO: join conversation_participants + order by latest message
  const { data, error } = await supabase.from('conversations').select('*').order('created_at', { ascending: false }).limit(50);
  if (error || !data) return [];
  return data as ConversationRow[];
}

export async function listMessages(conversationId: string, limit = 50): Promise<MessageRow[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error || !data) return [];
  return data as MessageRow[];
}

export async function sendTextMessage(
  conversationId: string,
  senderId: string,
  body: string,
): Promise<MessageRow | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: senderId, body })
    .select('*')
    .single();
  if (error || !data) return null;
  return data as MessageRow;
}
