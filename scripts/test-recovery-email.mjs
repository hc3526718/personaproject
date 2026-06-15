/**
 * Trigger password recovery email (Send Email hook + custom domain logo).
 *   node scripts/test-recovery-email.mjs [email]
 */
const anon = process.env.SUPABASE_ANON_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!anon) {
  console.error('Set SUPABASE_ANON_KEY or EXPO_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const email = process.argv[2]?.trim() || 'haydncampbell22@gmail.com';

const res = await fetch('https://txehbzyntvqpkkegjrwp.supabase.co/auth/v1/recover', {
  method: 'POST',
  headers: {
    apikey: anon,
    Authorization: `Bearer ${anon}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email,
    redirect_to: 'https://daltongrantacademy.uk/app/auth/callback',
  }),
});

const text = await res.text();
console.log('email:', email);
console.log('HTTP', res.status);
console.log(text);
process.exit(res.ok ? 0 : 1);
