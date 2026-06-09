# MFA / TOTP setup (Dalton)

Two-factor authentication uses **Supabase Auth MFA (TOTP)** — an authenticator app (Google Authenticator, 1Password, Authy, etc.).

## 1. Enable in Supabase (project admin)

1. [Supabase Dashboard](https://supabase.com/dashboard) → your project  
2. **Authentication** → **MFA** (or **Settings** → **Auth** → **Multi-Factor Authentication**)  
3. Enable **TOTP (Authenticator app)**  
4. Optional: set **Enrollment** to “Optional” for members, stricter policy for staff later  

Docs: [Supabase MFA](https://supabase.com/docs/guides/auth/auth-mfa)

## 2. Who should enroll first

- Every account with `profiles.master_control = 'yes'`  
- Any staff with access to Master Control or destructive Edge Functions  

## 3. In-app enrollment (shipped)

**Staff / master accounts** (`master_control` or admin role):

1. **Settings → Account & Security → Set up authenticator**  
2. Or prompted automatically when opening **Master Control** without MFA  

Implementation: `MfaEnrollScreen`, `auth/mfaService.ts`.

## 4. Sign-in with MFA (shipped)

After enrollment, email/password login reaches AAL1; the app shows **`MfaChallengeScreen`** until the user enters a valid TOTP code (`verifyMfaLoginCode`).

## 5. Leaked password protection (related)

Dashboard → **Authentication** → **Password security** → enable **Leaked password protection** (HaveIBeenPwned).

## 6. Checklist

| Step | Owner |
|------|--------|
| Enable TOTP in Supabase MFA settings | You |
| Enroll master/staff accounts | You |
| Implement login MFA challenge UI | Done (`MfaChallengeScreen`) |
| Enable leaked password protection | You |
| Document recovery if user loses phone | Support playbook |
