import type { ReactNode } from 'react';
import { useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FontAwesome, FontAwesome5 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DEMO_EMAIL, DEMO_PASSWORD, useAuth } from '../auth/AuthContext';
import { ScreenHeader } from '../components/ScreenHeader';
import { BRAND_LOGO } from '../constants/brandLogo';
import { DS } from '../designSystem';
import type { AuthStackParamList } from '../navigation/types';

type Props<K extends keyof AuthStackParamList> = NativeStackScreenProps<AuthStackParamList, K>;

export function WelcomeHubScreen({ navigation }: Props<'WelcomeHub'>) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.root,
        { paddingTop: insets.top + DS.space.md, paddingBottom: insets.bottom + DS.space.lg },
      ]}
    >
      <ScrollView contentContainerStyle={styles.welcomeScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.welcomeHero}>
          <Image source={BRAND_LOGO} style={styles.welcomeLogo} resizeMode="contain" />
          <Text style={styles.grant}>Grant Access</Text>
          <Text style={styles.welcomeLead}>Elite Athletic Mentorship</Text>
          <Text style={styles.welcomeSub}>
            Connect with world-class coaches and athletes. Access exclusive training content and
            community insights.
          </Text>
          <Text style={styles.demoHint}>
            Demo sign-in: {DEMO_EMAIL} · Password: {DEMO_PASSWORD}
          </Text>
        </View>
      </ScrollView>
      <View style={styles.welcomeActions}>
        <Pressable
          style={styles.primaryBtn}
          onPress={() => navigation.navigate('GrantAccess', { startAt: 'signup' })}
        >
          <Text style={styles.primaryBtnText}>Sign Up</Text>
        </Pressable>
        <Pressable style={styles.ghostBtn} onPress={() => navigation.navigate('LogIn')}>
          <Text style={styles.ghostBtnText}>Log In</Text>
        </Pressable>
        <View style={styles.orRow}>
          <View style={styles.orLine} />
          <Text style={styles.orText}>OR</Text>
          <View style={styles.orLine} />
        </View>
        <Pressable style={styles.socialBtn}>
          <FontAwesome5 name="apple" size={20} color={DS.color.text} brand />
          <Text style={styles.socialText}>Continue with Apple</Text>
        </Pressable>
        <Pressable style={styles.socialBtn}>
          <FontAwesome5 name="google" size={18} color={DS.color.text} brand />
          <Text style={styles.socialText}>Continue with Google</Text>
        </Pressable>
        <Text style={styles.legal}>
          By continuing, you agree to our <Text style={styles.gold}>Terms</Text> and{' '}
          <Text style={styles.gold}>Privacy Policy</Text>
        </Text>
      </View>
    </View>
  );
}

export function LogInScreen({ navigation }: Props<'LogIn'>) {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [email, setEmail] = useState(DEMO_EMAIL);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [remember, setRemember] = useState(true);
  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenHeader title="Log In" onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={[styles.scrollPad, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.loginDemoHint}>
          Demo: fields are pre-filled. Tap Log In, or edit and use {DEMO_EMAIL} / {DEMO_PASSWORD}
        </Text>
        <Field label="Email">
          <TextInput
            style={styles.input}
            placeholder="athlete@example.com"
            placeholderTextColor={DS.color.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        </Field>
        <Field label="Password">
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, styles.inputFlex]}
              placeholder="••••••••"
              placeholderTextColor={DS.color.textMuted}
              secureTextEntry={!passwordVisible}
              value={password}
              onChangeText={setPassword}
            />
            <Pressable onPress={() => setPasswordVisible((v) => !v)}>
              <FontAwesome
                name={passwordVisible ? 'eye-slash' : 'eye'}
                size={18}
                color={DS.color.textMuted}
              />
            </Pressable>
          </View>
        </Field>
        <View style={styles.loginOpts}>
          <Pressable style={styles.rememberRow} onPress={() => setRemember((r) => !r)}>
            <View style={[styles.checkbox, remember && styles.checkboxOn]}>
              {remember ? (
                <FontAwesome name="check" size={12} color={DS.color.background} />
              ) : null}
            </View>
            <Text style={styles.rememberText}>Remember me</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('ForgotPassword')}>
            <Text style={styles.gold}>Forgot Password?</Text>
          </Pressable>
        </View>
        <Pressable
          style={styles.primaryBtn}
          onPress={() => {
            void (async () => {
              const ok = await login(email.trim(), password);
              if (ok) return;
              Alert.alert('Log in failed', `Use ${DEMO_EMAIL} and password: ${DEMO_PASSWORD}`);
            })();
          }}
        >
          <Text style={styles.primaryBtnText}>Log In</Text>
        </Pressable>
        <View style={styles.orRow}>
          <View style={styles.orLine} />
          <Text style={styles.orText}>OR</Text>
          <View style={styles.orLine} />
        </View>
        <Pressable style={styles.socialBtn}>
          <FontAwesome5 name="apple" size={20} color={DS.color.text} brand />
          <Text style={styles.socialText}>Continue with Apple</Text>
        </Pressable>
        <Pressable style={styles.socialBtn}>
          <FontAwesome5 name="google" size={18} color={DS.color.text} brand />
          <Text style={styles.socialText}>Continue with Google</Text>
        </Pressable>
        <View style={styles.footerRow}>
          <Text style={styles.muted}>Don&apos;t have an account? </Text>
          <Pressable onPress={() => navigation.navigate('GrantAccess', { startAt: 'signup' })}>
            <Text style={styles.gold}>Create Account</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function ForgotPasswordScreen({ navigation }: Props<'ForgotPassword'>) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.root}>
      <ScreenHeader title="Forgot Password" onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={[styles.scrollPad, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.infoCard}>
          <View style={styles.infoIconCircle}>
            <FontAwesome name="lock" size={22} color={DS.color.gold} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoCardTitle}>Reset Your Password</Text>
            <Text style={styles.infoCardBody}>
              Enter your email address and we&apos;ll send you a verification code to reset your
              password.
            </Text>
          </View>
        </View>
        <Field label="Email Address">
          <TextInput
            style={styles.input}
            placeholder="athlete@example.com"
            placeholderTextColor={DS.color.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </Field>
        <Pressable style={styles.primaryBtn} onPress={() => navigation.navigate('VerifyReset')}>
          <Text style={styles.primaryBtnText}>Send Reset Code</Text>
        </Pressable>
        <View style={styles.footerRow}>
          <Text style={styles.muted}>Remember your password? </Text>
          <Pressable onPress={() => navigation.navigate('LogIn')}>
            <Text style={styles.gold}>Back to Log In</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

export function VerifyResetScreen({ navigation }: Props<'VerifyReset'>) {
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState('');
  const hiddenRef = useRef<TextInput>(null);
  return (
    <View style={styles.root}>
      <ScreenHeader title="Verify Code" onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={[styles.scrollPad, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.infoCard}>
          <View style={styles.infoIconCircle}>
            <FontAwesome name="envelope" size={20} color={DS.color.gold} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoCardTitle}>Check Your Email</Text>
            <Text style={styles.infoCardBody}>
              We sent a 6-digit code to your email.{' '}
              <Text style={styles.gold}>Change Email</Text>
            </Text>
          </View>
        </View>
        <Text style={styles.label}>Enter 6-Digit Code</Text>
        <Pressable style={styles.codeRow} onPress={() => hiddenRef.current?.focus()}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={styles.codeCell}>
              <Text style={styles.codeCellText}>{code[i] ?? ''}</Text>
            </View>
          ))}
        </Pressable>
        <TextInput
          ref={hiddenRef}
          value={code}
          onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
          keyboardType="number-pad"
          maxLength={6}
          style={styles.codeHidden}
        />
        <Pressable style={styles.resendRow}>
          <FontAwesome name="refresh" size={14} color={DS.color.gold} />
          <Text style={styles.resendText}> Resend Code</Text>
        </Pressable>
        <Pressable style={styles.primaryBtn} onPress={() => navigation.navigate('CreatePassword')}>
          <Text style={styles.primaryBtnText}>Verify &amp; Continue</Text>
        </Pressable>
        <View style={styles.footerRow}>
          <Text style={styles.muted}>Need help? </Text>
          <Pressable>
            <Text style={styles.gold}>Contact Support</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function passwordStrength(pw: string): { pct: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (/[A-Z]/.test(pw)) score += 1;
  if (/[a-z]/.test(pw)) score += 1;
  if (/[0-9]/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;
  const labels = ['Enter password', 'Weak', 'Fair', 'Good', 'Strong', 'Strong'];
  const colors = [
    DS.color.textMuted,
    DS.color.error,
    '#F59E0B',
    '#10B981',
    '#4CAF50',
    '#4CAF50',
  ];
  return { pct: (score / 5) * 100, label: labels[score], color: colors[score] };
}

export function CreatePasswordScreen({ navigation }: Props<'CreatePassword'>) {
  const insets = useSafeAreaInsets();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);
  const strength = useMemo(() => passwordStrength(pw), [pw]);
  const reqs = useMemo(
    () => [
      { ok: pw.length >= 8, t: 'At least 8 characters' },
      { ok: /[A-Z]/.test(pw), t: 'One uppercase letter' },
      { ok: /[a-z]/.test(pw), t: 'One lowercase letter' },
      { ok: /[0-9]/.test(pw), t: 'One number' },
      { ok: /[^A-Za-z0-9]/.test(pw), t: 'One special character' },
    ],
    [pw],
  );
  return (
    <View style={styles.root}>
      <ScreenHeader title="Create Password" onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={[styles.scrollPad, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.infoCard}>
          <View style={styles.infoIconCircle}>
            <FontAwesome5 name="shield-alt" size={20} color={DS.color.gold} solid />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoCardTitle}>Secure Your Account</Text>
            <Text style={styles.infoCardBody}>
              Create a strong password to protect your athlete profile and training data.
            </Text>
          </View>
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>New Password</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, styles.inputFlex]}
              placeholder="Enter your new password"
              placeholderTextColor={DS.color.textMuted}
              secureTextEntry={!show1}
              value={pw}
              onChangeText={setPw}
            />
            <Pressable onPress={() => setShow1((s) => !s)}>
              <FontAwesome name={show1 ? 'eye-slash' : 'eye'} size={18} color={DS.color.textMuted} />
            </Pressable>
          </View>
          <View style={styles.strengthBlock}>
            <View style={styles.strengthLabels}>
              <Text style={styles.strengthHint}>Password Strength</Text>
              <Text style={[styles.strengthHint, { color: strength.color }]}>{strength.label}</Text>
            </View>
            <View style={styles.strengthTrack}>
              <View
                style={[
                  styles.strengthFill,
                  { width: `${strength.pct}%`, backgroundColor: strength.color },
                ]}
              />
            </View>
          </View>
        </View>
        <Field label="Confirm Password">
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, styles.inputFlex]}
              placeholder="••••••••"
              placeholderTextColor={DS.color.textMuted}
              secureTextEntry={!show2}
              value={pw2}
              onChangeText={setPw2}
            />
            <Pressable onPress={() => setShow2((s) => !s)}>
              <FontAwesome name={show2 ? 'eye-slash' : 'eye'} size={18} color={DS.color.textMuted} />
            </Pressable>
          </View>
        </Field>
        <Text style={styles.reqHeading}>Password Requirements</Text>
        {reqs.map((r) => (
          <Text key={r.t} style={[styles.reqLine, r.ok && styles.reqLineOk]}>
            {r.ok ? '✓ ' : '○ '}
            {r.t}
          </Text>
        ))}
        <Pressable style={styles.primaryBtn} onPress={() => navigation.navigate('LogIn')}>
          <Text style={styles.primaryBtnText}>Create Password</Text>
        </Pressable>
        <View style={styles.footerRow}>
          <Text style={styles.muted}>Need help? </Text>
          <Pressable>
            <Text style={styles.gold}>Contact Support</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: DS.color.background,
  },
  scrollPad: {
    paddingHorizontal: DS.space.lg,
    paddingTop: DS.space.md,
    flexGrow: 1,
  },
  loginDemoHint: {
    fontSize: 12,
    color: DS.color.textMuted,
    lineHeight: 18,
    marginBottom: DS.space.lg,
  },
  welcomeScroll: {
    flexGrow: 1,
    paddingHorizontal: DS.space.lg,
    paddingTop: DS.space.xxl,
    alignItems: 'center',
  },
  welcomeHero: {
    alignItems: 'center',
    marginBottom: DS.space.xl,
  },
  welcomeLogo: {
    width: 120,
    height: 120,
    marginBottom: DS.space.md,
  },
  grant: {
    fontSize: 13,
    color: DS.color.textMuted,
    letterSpacing: 4,
    textTransform: 'uppercase',
    marginBottom: DS.space.xl,
  },
  welcomeLead: {
    fontSize: 18,
    color: DS.color.text,
    fontWeight: '600',
    marginBottom: DS.space.md,
  },
  welcomeSub: {
    fontSize: 14,
    color: DS.color.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },
  demoHint: {
    marginTop: DS.space.lg,
    fontSize: 12,
    color: DS.color.gold,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 320,
    opacity: 0.95,
  },
  welcomeActions: {
    paddingHorizontal: DS.space.lg,
    gap: DS.space.md,
  },
  field: {
    marginBottom: DS.space.lg,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: DS.color.gold,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: DS.space.sm,
  },
  input: {
    backgroundColor: DS.color.input,
    borderRadius: DS.radius.lg,
    padding: DS.space.base,
    fontSize: 16,
    color: DS.color.text,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DS.color.input,
    borderRadius: DS.radius.lg,
    paddingHorizontal: DS.space.base,
    paddingVertical: DS.space.md,
  },
  inputFlex: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    marginRight: DS.space.sm,
  },
  loginOpts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: DS.space.sm,
    marginBottom: DS.space.lg,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.space.md,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: DS.color.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: DS.color.gold,
    borderColor: DS.color.gold,
  },
  rememberText: {
    fontSize: 14,
    color: DS.color.text,
  },
  primaryBtn: {
    backgroundColor: DS.color.gold,
    paddingVertical: DS.space.base,
    borderRadius: DS.radius.lg,
    alignItems: 'center',
    marginTop: DS.space.md,
  },
  primaryBtnText: {
    color: DS.color.background,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  ghostBtn: {
    borderWidth: 1,
    borderColor: DS.color.border,
    paddingVertical: DS.space.base,
    borderRadius: DS.radius.lg,
    alignItems: 'center',
  },
  ghostBtnText: {
    color: DS.color.text,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: DS.space.lg,
  },
  orLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: DS.color.border,
    opacity: 0.3,
  },
  orText: {
    marginHorizontal: DS.space.base,
    color: DS.color.textMuted,
    fontSize: 14,
  },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: DS.space.md,
    backgroundColor: DS.color.surface,
    paddingVertical: DS.space.base,
    borderRadius: DS.radius.lg,
    marginBottom: DS.space.sm,
  },
  socialText: {
    color: DS.color.text,
    fontSize: 16,
    fontWeight: '500',
  },
  legal: {
    textAlign: 'center',
    fontSize: 12,
    color: DS.color.textMuted,
    marginTop: DS.space.md,
  },
  gold: {
    color: DS.color.gold,
    fontWeight: '600',
  },
  muted: {
    color: DS.color.textMuted,
    fontSize: 15,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: DS.space.xl,
  },
  bodyCenter: {
    textAlign: 'center',
    color: DS.color.textMuted,
    lineHeight: 22,
    marginBottom: DS.space.xl,
  },
  infoCard: {
    flexDirection: 'row',
    gap: DS.space.base,
    backgroundColor: DS.color.surface,
    borderRadius: DS.radius.lg,
    padding: DS.space.lg,
    marginBottom: DS.space.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: DS.color.border,
  },
  infoIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: DS.color.goldTint10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCardTitle: {
    fontFamily: DS.font.heading,
    fontSize: 18,
    color: DS.color.gold,
    letterSpacing: 1,
    marginBottom: DS.space.sm,
    textTransform: 'uppercase',
  },
  infoCardBody: {
    fontFamily: DS.font.body,
    fontSize: 14,
    color: DS.color.textMuted,
    lineHeight: 22,
  },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: DS.space.lg,
  },
  codeCell: {
    flex: 1,
    aspectRatio: 0.85,
    maxHeight: 56,
    backgroundColor: DS.color.input,
    borderRadius: DS.radius.md,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeCellText: {
    fontFamily: DS.font.bodyBold,
    fontSize: 22,
    color: DS.color.text,
  },
  codeHidden: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: DS.space.lg,
  },
  resendText: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 14,
    color: DS.color.gold,
  },
  strengthBlock: {
    marginTop: DS.space.md,
  },
  strengthLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: DS.space.sm,
  },
  strengthHint: {
    fontSize: 12,
    color: DS.color.textMuted,
  },
  strengthTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: DS.color.input,
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  reqHeading: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 11,
    color: DS.color.gold,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginTop: DS.space.lg,
    marginBottom: DS.space.sm,
  },
  reqLine: {
    fontFamily: DS.font.body,
    fontSize: 13,
    color: DS.color.textMuted,
    marginBottom: 6,
  },
  reqLineOk: {
    color: '#4CAF50',
  },
});
