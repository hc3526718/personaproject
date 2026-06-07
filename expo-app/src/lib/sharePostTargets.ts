import { formatAuthorDisplayName } from './communityPostBody';
import { listFollowingProfiles } from '../roadmap/followService';
import { listConversationSummaries } from '../roadmap/messagingService';

export type SharePostTarget = {
  id: string;
  name: string;
  avatarUrl: string | null;
};

export async function loadSharePostTargets(userId: string): Promise<SharePostTarget[]> {
  const [following, convos] = await Promise.all([
    listFollowingProfiles(userId),
    listConversationSummaries(userId),
  ]);

  const map = new Map<string, SharePostTarget>();

  for (const profile of following) {
    map.set(profile.id, {
      id: profile.id,
      name: formatAuthorDisplayName(profile),
      avatarUrl: profile.avatar_url?.trim() || null,
    });
  }

  for (const c of convos) {
    if (map.has(c.peer_user_id)) continue;
    map.set(c.peer_user_id, {
      id: c.peer_user_id,
      name: c.peer_display_name?.trim() || 'Member',
      avatarUrl: c.peer_avatar_url?.trim() || null,
    });
  }

  return [...map.values()].slice(0, 24);
}

export function buildPostShareMessage(authorName: string, body: string, postId: string): string {
  const snippet = body.trim().slice(0, 280);
  return `${authorName} on The Dalton Grant Academy\n\n${snippet}\n\nPost ref: ${postId}`;
}
