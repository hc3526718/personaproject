import type { Factor, SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from '../lib/supabase';

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

export async function fetchTotpFactors(): Promise<Factor[]> {
  const supabase = client();
  if (!supabase) return [];
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) return [];
  return listVerifiedTotpFactors(data?.totp);
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

export async function startTotpEnrollment(): Promise<
  { ok: true; enroll: TotpEnrollStart } | { ok: false; message: string }
> {
  const supabase = client();
  if (!supabase) return { ok: false, message: 'Supabase is not configured.' };

  const existing = await fetchTotpFactors();
  if (existing.length > 0) {
    return { ok: false, message: 'Authenticator is already enrolled on this account.' };
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: 'Dalton Authenticator',
  });
  if (error || !data?.id || !data.totp) {
    return { ok: false, message: error?.message ?? 'Could not start MFA enrollment.' };
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
    return { ok: false, message: chErr?.message ?? 'Could not start verification.' };
  }

  const { error: verErr } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code: trimmed,
  });
  if (verErr) {
    return { ok: false, message: verErr.message };
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
    return { ok: false, message: chErr?.message ?? 'Could not start MFA challenge.' };
  }

  const { error: verErr } = await supabase.auth.mfa.verify({
    factorId: factor.id,
    challengeId: challenge.id,
    code: trimmed,
  });
  if (verErr) {
    return { ok: false, message: verErr.message };
  }
  return { ok: true };
}

export async function unenrollTotpFactor(
  factorId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = client();
  if (!supabase) return { ok: false, message: 'Supabase is not configured.' };
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}
