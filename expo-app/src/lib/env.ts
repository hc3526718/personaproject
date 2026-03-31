/**
 * Public env vars (EXPO_PUBLIC_*) available at runtime in Expo.
 */
export function getSupabaseUrl(): string {
  return (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').trim();
}

export function getSupabaseAnonKey(): string {
  return (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}

export function getApiBaseUrl(): string {
  return (process.env.EXPO_PUBLIC_API_BASE_URL ?? '').replace(/\/$/, '');
}

export function getTicketSigningSecret(): string {
  return (
    process.env.EXPO_PUBLIC_TICKET_SIGNING_SECRET ??
    'dalton-demo-ticket-secret'
  ).trim();
}

export function getRevenueCatApiKey(): string | undefined {
  const ios = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS?.trim();
  const android = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID?.trim();
  // Caller should pass Platform.OS
  return ios || android;
}
