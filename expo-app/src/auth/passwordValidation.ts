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

/** User-facing copy for Supabase/Resend auth email failures (sign-up, password reset). */
export function mapAuthEmailErrorMessage(raw: string): string {
  const m = raw.toLowerCase();
  if (
    m.includes('rate limit') ||
    m.includes('over_email_send_rate_limit') ||
    m.includes('too many requests') ||
    m.includes('429')
  ) {
    return (
      'Too many verification emails were sent recently. ' +
      'Wait about an hour, then try Log In if you already signed up, or try Sign Up again with the same email.'
    );
  }
  if (
    m.includes('unexpected status code returned from hook') ||
    m.includes('hook: 500') ||
    m.includes('hook returned') ||
    m.includes('unexpected_failure')
  ) {
    return (
      'We could not send the verification email (mail service is not fully configured for new addresses). ' +
      'If you already registered, try Log In. Otherwise wait a few minutes and try again, or contact support via the website contact form.'
    );
  }
  if (m.includes('confirmation email') || m.includes('sending email') || m.includes('error sending')) {
    return (
      'We could not send the verification email right now. ' +
      'If you already registered, try Log In. Otherwise wait a few minutes and try again, or contact support.'
    );
  }
  return raw;
}

export function mapSignUpErrorMessage(raw: string): string {
  const m = raw.toLowerCase();
  if (
    m.includes('rate limit') ||
    m.includes('over_email_send_rate_limit') ||
    m.includes('too many requests') ||
    m.includes('429')
  ) {
    return mapAuthEmailErrorMessage(raw);
  }
  if (
    m.includes('unexpected status code returned from hook') ||
    m.includes('hook: 500') ||
    m.includes('hook returned')
  ) {
    return mapAuthEmailErrorMessage(raw);
  }
  if (m.includes('confirmation email') || m.includes('sending email') || m.includes('error sending')) {
    return mapAuthEmailErrorMessage(raw);
  }
  if (m.includes('unexpected_failure')) {
    return mapAuthEmailErrorMessage(raw);
  }
  if (m.includes('weak') || m.includes('password')) {
    return 'Password must include lowercase, uppercase letters and digits.';
  }
  if (
    m.includes('already registered') ||
    m.includes('already been registered') ||
    m.includes('user already registered')
  ) {
    return (
      'This email is already registered. ' +
      'If you created the account with Google or Apple, use that button. Otherwise, use Log In.'
    );
  }
  return raw;
}
