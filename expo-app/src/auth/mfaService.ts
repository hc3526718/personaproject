import type { Factor, SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from '../lib/supabase';
import { coerceApiError } from '../lib/appAlert';

export const MFA_APP_LABEL = 'DGA';

export type TotpEnrollStart = {
  factorId: string;
  qrSvg: string;
  secret: string;
  uri: string;
};

function client(): SupabaseClient | null {
  return getSupabase();
}

export function listVerifiedTotpFactors(factors: Factor[] | undefined): Factor[] {
  return (factors ?? []).filter((f) => f.factor_type === 'totp' && f.status === 'verified');
}

export function listAllTotpFactors(factors: Factor[] | undefined): Factor[] {
  return (factors ?? []).filter((f) => f.factor_type === 'totp');
}

export async function listTotpFactorsRaw(): Promise<{
  verified: Factor[];
  unverified: Factor[];
  error?: string;
}> {
  const supabase = client();
  if (!supabase) return { verified: [], unverified: [] };
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) return { verified: [], unverified: [], error: coerceApiError('load security settings', error.message) };
  const all = listAllTotpFactors(data?.totp);
  return {
    verified: listVerifiedTotpFactors(data?.totp),
    unverified: all.filter((f) => f.status !== 'verified'),
  };
}

export async function fetchTotpFactors(): Promise<Factor[]> {
  const { verified } = await listTotpFactorsRaw();
  return verified;
}

export async function hasVerifiedTotpFactor(): Promise<boolean> {
  const factors = await fetchTotpFactors();
  return factors.length > 0;
}

export async function needsMfaStepUp(): Promise<boolean> {
  const supabase = client();
  if (!supabase) return false;
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error || !data) return false;
  return data.nextLevel === 'aal2' && data.currentLevel !== 'aal2';
}

/** Remove stale unverified TOTP factors left from abandoned enrollment attempts. */
export async function clearUnverifiedTotpFactors(): Promise<void> {
  const supabase = client();
  if (!supabase) return;
  const { unverified } = await listTotpFactorsRaw();
  for (const factor of unverified) {
    if (factor.id) {
      await supabase.auth.mfa.unenroll({ factorId: factor.id });
    }
  }
}

export async function startTotpEnrollment(): Promise<
  { ok: true; enroll: TotpEnrollStart } | { ok: false; message: string }
> {
  const supabase = client();
  if (!supabase) return { ok: false, message: 'Supabase is not configured.' };

  const { verified, unverified, error: listErr } = await listTotpFactorsRaw();
  if (listErr) return { ok: false, message: listErr };

  if (verified.length > 0) {
    return { ok: false, message: 'Authenticator is already enrolled on this account.' };
  }

  await clearUnverifiedTotpFactors();

  const attemptEnroll = async () => {
    return supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: MFA_APP_LABEL,
    });
  };

  let { data, error } = await attemptEnroll();

  if (error && (error.status === 422 || /already|exists|duplicate/i.test(error.message ?? ''))) {
    await clearUnverifiedTotpFactors();
    const retry = await attemptEnroll();
    data = retry.data;
    error = retry.error;
  }

  if (error || !data?.id || !data.totp) {
    const msg = error?.message ?? 'Could not start MFA enrollment.';
    if (/already|exists|duplicate/i.test(msg)) {
      return {
        ok: false,
        message:
          'An authenticator entry already exists for this account. Remove the existing DGA entry from your authenticator app, then try again.',
      };
    }
    return { ok: false, message: coerceApiError('set up two-factor authentication', msg) };
  }

  return {
    ok: true,
    enroll: {
      factorId: data.id,
      qrSvg: data.totp.qr_code,
      secret: data.totp.secret,
      uri: data.totp.uri,
    },
  };
}

export async function completeTotpEnrollment(
  factorId: string,
  code: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = client();
  if (!supabase) return { ok: false, message: 'Supabase is not configured.' };
  const trimmed = code.replace(/\D/g, '');
  if (trimmed.length !== 6) {
    return { ok: false, message: 'Enter the 6-digit code from your authenticator app.' };
  }

  const { data: challenge, error: chErr } = await supabase.auth.mfa.challenge({ factorId });
  if (chErr || !challenge?.id) {
    return { ok: false, message: coerceApiError('verify your authenticator', chErr?.message) };
  }

  const { error: verErr } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code: trimmed,
  });
  if (verErr) {
    return { ok: false, message: coerceApiError('verify your authenticator', verErr.message) };
  }
  return { ok: true };
}

export async function verifyMfaLoginCode(
  code: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = client();
  if (!supabase) return { ok: false, message: 'Supabase is not configured.' };
  const trimmed = code.replace(/\D/g, '');
  if (trimmed.length !== 6) {
    return { ok: false, message: 'Enter the 6-digit code from your authenticator app.' };
  }

  const factors = await fetchTotpFactors();
  const factor = factors[0];
  if (!factor?.id) {
    return { ok: false, message: 'No authenticator enrolled on this account.' };
  }

  const { data: challenge, error: chErr } = await supabase.auth.mfa.challenge({ factorId: factor.id });
  if (chErr || !challenge?.id) {
    return { ok: false, message: coerceApiError('verify your security code', chErr?.message) };
  }

  const { error: verErr } = await supabase.auth.mfa.verify({
    factorId: factor.id,
    challengeId: challenge.id,
    code: trimmed,
  });
  if (verErr) {
    return { ok: false, message: coerceApiError('verify your security code', verErr.message) };
  }
  return { ok: true };
}

export async function unenrollTotpFactor(
  factorId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = client();
  if (!supabase) return { ok: false, message: 'Supabase is not configured.' };
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) return { ok: false, message: coerceApiError('remove two-factor authentication', error.message) };
  return { ok: true };
}
