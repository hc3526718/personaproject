export type PasswordRequirement = 'lowercase' | 'uppercase' | 'digit';

export type PasswordValidation = {
  ok: boolean;
  missing: PasswordRequirement[];
};

const MIN_PASSWORD_LENGTH = 8;

/** Supabase weak-password policy: at least one lowercase, uppercase, and digit. */
export function validateSignupPassword(password: string): PasswordValidation {
  const missing: PasswordRequirement[] = [];
  if (!/[a-z]/.test(password)) missing.push('lowercase');
  if (!/[A-Z]/.test(password)) missing.push('uppercase');
  if (!/\d/.test(password)) missing.push('digit');
  const ok = password.length >= MIN_PASSWORD_LENGTH && missing.length === 0;
  return { ok, missing };
}

export function signupPasswordErrorMessage(validation: PasswordValidation): string {
  if (validation.ok) return '';
  if (validation.missing.length > 0) {
    return 'Password must include lowercase, uppercase letters and digits.';
  }
  return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
}

export function mapSignUpErrorMessage(raw: string): string {
  const m = raw.toLowerCase();
  if (m.includes('confirmation email') || m.includes('sending email') || m.includes('error sending')) {
    return (
      'We could not send the verification email right now. ' +
      'If you already registered, try Log In. Otherwise wait a few minutes and try again, or contact support.'
    );
  }
  if (m.includes('weak') || m.includes('password')) {
    return 'Password must include lowercase, uppercase letters and digits.';
  }
  if (m.includes('already registered') || m.includes('already been registered')) {
    return 'This email is already registered. Try Log In instead.';
  }
  return raw;
}
