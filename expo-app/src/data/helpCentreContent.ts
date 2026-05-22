export type HelpArticle = {
  id: string;
  title: string;
  body: string;
  /** Lowercase tokens for in-app search (title + keywords). */
  keywords: string[];
};

export const HELP_SUGGESTED_SEARCHES = [
  'Premium subscription',
  'Dalton verification',
  'Book an event',
  'Restore purchases',
  'Delete account',
  'Accessibility',
  'Offline mode',
  'Report a post',
] as const;

function matchesQuery(article: HelpArticle, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const hay = `${article.title} ${article.body} ${article.keywords.join(' ')}`.toLowerCase();
  return hay.includes(needle);
}

export function filterHelpArticles(articles: HelpArticle[], query: string): HelpArticle[] {
  return articles.filter((a) => matchesQuery(a, query));
}

/** Bundled help — available offline in Settings → Help centre. */
export const HELP_CENTRE_ARTICLES: HelpArticle[] = [
  {
    id: 'getting-started',
    title: 'Getting started',
    keywords: ['sign up', 'login', 'onboarding', 'google', 'apple', 'account'],
    body:
      'Sign in with email, Google, or Apple (iOS). Complete onboarding (role, sports, username), then explore Community, Events, Media, Sponsors, and Profile. Use the same email on web at dalton-access.vercel.app/app.',
  },
  {
    id: 'premium',
    title: 'Premium & one subscription',
    keywords: ['subscribe', 'paywall', 'stripe', 'revenuecat', 'billing', 'restore', 'web', 'ios', 'android'],
    body:
      'Premium unlocks creator tools after Dalton verification. Pay on web (Stripe) or on iPhone/Android (App Store / Play)—one subscription per account, not per device. Sign in with the same email everywhere; status syncs via your account. Web: Profile → Premium. Mobile: Restore purchases after signing in.',
  },
  {
    id: 'verification',
    title: 'Dalton verification',
    keywords: ['verified', 'creator', 'awaiting', 'publish', 'host', 'upload'],
    body:
      'Premium is required first. Dalton verification is a separate team approval before you can publish events or media. If you see “Awaiting Dalton verification”, your review is in progress—contact Support if it has been longer than expected.',
  },
  {
    id: 'community',
    title: 'Community feed & posts',
    keywords: ['feed', 'post', 'comment', 'like', 'refresh', 'realtime'],
    body:
      'Pull down to refresh the feed. New posts from others appear when you are online (realtime). Switching back to the app also refreshes the feed. Create posts from the + button where enabled.',
  },
  {
    id: 'events',
    title: 'Events & bookings',
    keywords: ['book', 'ticket', 'qr', 'check-in', 'saved', 'host'],
    body:
      'Discover events under Events → filters (All, Bookings, Saved). Booking requires an internet connection. Host tools and QR check-in need Premium and verification.',
  },
  {
    id: 'messages',
    title: 'Messages',
    keywords: ['dm', 'inbox', 'chat', 'thread', 'offline'],
    body:
      'Open messages from Community (paper plane) or your inbox. Recent threads may be readable offline for a limited time; sending messages requires a connection.',
  },
  {
    id: 'accessibility',
    title: 'Accessibility',
    keywords: ['larger text', 'contrast', 'dark', 'color', 'settings'],
    body:
      'Profile → Settings → Accessibility: Larger Text, Differentiate Without Color, and Sufficient Contrast. Grant Access uses a dark interface by default. Preferences sync across devices when signed in.',
  },
  {
    id: 'legal',
    title: 'Legal & privacy',
    keywords: ['terms', 'privacy', 'cookies', 'athlete agreement'],
    body:
      'Profile → Settings → Legal opens Terms, Privacy, Cookie policy, and Athlete agreement on the Grant Access website.',
  },
  {
    id: 'account-delete',
    title: 'Delete my account',
    keywords: ['gdpr', 'remove', 'deletion', 'support'],
    body:
      'Account deletion is requested through Support (Settings → Support → Contact us) until in-app deletion is available. Include the email on your account.',
  },
  {
    id: 'troubleshoot',
    title: 'Something not working?',
    keywords: ['bug', 'crash', 'error', 'connection', 'update'],
    body:
      'Force-close and reopen the app, check your connection, and install the latest build. For billing, use Restore purchases (mobile) or refresh after web payment. Contact Support with your account email and platform (iOS / Android / web).',
  },
];
