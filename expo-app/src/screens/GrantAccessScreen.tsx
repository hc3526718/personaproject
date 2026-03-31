import type { ReactNode } from 'react';
import { useCallback, useState } from 'react';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
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
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FontAwesome, FontAwesome5 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DEMO_EMAIL, DEMO_PASSWORD, useAuth } from '../auth/AuthContext';
import { BRAND_LOGO } from '../constants/brandLogo';
import { DS } from '../designSystem';
import type { AuthStackParamList } from '../navigation/types';

type Phase = 'splash' | 'signup';
type Nav = NativeStackNavigationProp<AuthStackParamList>;
type GrantRoute = RouteProp<AuthStackParamList, 'GrantAccess'>;

export default function GrantAccessScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const route = useRoute<GrantRoute>();
  const { login } = useAuth();
  const [phase, setPhase] = useState<Phase>('splash');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useFocusEffect(
    useCallback(() => {
      const start = route.params?.startAt;
      setPhase(start === 'signup' ? 'signup' : 'splash');
    }, [route.params?.startAt]),
  );

  const tryEnterApp = useCallback(async () => {
    const ok = await login(email.trim(), password);
    if (ok) return;
    Alert.alert(
      'Demo account',
      `Use ${DEMO_EMAIL} and password: ${DEMO_PASSWORD}`,
    );
  }, [email, password, login]);

  const goWelcome = useCallback(() => {
    navigation.navigate('WelcomeHub');
  }, [navigation]);

  if (phase === 'splash') {
    return (
      <View style={styles.splashOuter}>
        {navigation.canGoBack() ? (
          <Pressable
            style={[styles.splashClose, { top: insets.top + DS.space.sm }]}
            onPress={() => navigation.goBack()}
            hitSlop={16}
          >
            <FontAwesome name="times" size={22} color={DS.color.textMuted} />
          </Pressable>
        ) : null}
        <Pressable
          style={[
            styles.splashRoot,
            {
              paddingTop: insets.top + DS.space.lg,
              paddingBottom: Math.max(insets.bottom, DS.space.lg),
            },
          ]}
          onPress={goWelcome}
        >
          <View style={styles.splashCenter}>
            <View style={styles.logoOuter}>
              <Image source={BRAND_LOGO} style={styles.splashLogo} resizeMode="contain" />
            </View>
            <Text style={styles.splashSubtitle}>Grant Access</Text>
            <Text style={styles.splashBody}>
              Elite sports mentorship from British Olympic high jumper Dalton Grant
            </Text>
          </View>
          <View style={styles.splashFooter}>
            <Text style={styles.splashHint}>Tap anywhere to continue</Text>
          </View>
        </Pressable>
      </View>
    );
  }

  const signupScrollPad = {
    paddingBottom: insets.bottom + DS.space.xxl,
  };

  return (
    <View style={[styles.signupRoot, { paddingTop: insets.top }]}>
      <View style={styles.signupHeader}>
        <Pressable onPress={goWelcome} hitSlop={12} style={styles.signupBack}>
          <FontAwesome name="arrow-left" size={22} color={DS.color.text} />
        </Pressable>
        <Text style={styles.signupHeading}>Create Account</Text>
        <View style={styles.signupHeaderSpacer} />
      </View>
      <KeyboardAvoidingView
        style={styles.signupKeyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.signupScroll, signupScrollPad]}
          showsVerticalScrollIndicator={false}
        >
          <Field label="Email">
            <View style={styles.inputShell}>
              <TextInput
                style={styles.textInput}
                placeholder="athlete@example.com"
                placeholderTextColor={DS.color.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
              />
            </View>
          </Field>
          <Field label="Password">
            <View style={styles.inputShellRow}>
              <TextInput
                style={[styles.textInput, styles.textInputFlex]}
                placeholder="••••••••"
                placeholderTextColor={DS.color.textMuted}
                secureTextEntry={!passwordVisible}
                value={password}
                onChangeText={setPassword}
              />
              <Pressable onPress={() => setPasswordVisible((v) => !v)} hitSlop={8}>
                <FontAwesome
                  name={passwordVisible ? 'eye-slash' : 'eye'}
                  size={18}
                  color={DS.color.textMuted}
                />
              </Pressable>
            </View>
          </Field>
          <Pressable style={styles.ghostBtn} onPress={() => void tryEnterApp()}>
            <Text style={styles.ghostBtnText}>Continue</Text>
          </Pressable>
          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>OR</Text>
            <View style={styles.orLine} />
          </View>
          <Pressable style={styles.socialBtn}>
            <FontAwesome5 name="apple" size={20} color={DS.color.text} brand />
            <Text style={styles.socialBtnText}>Continue with Apple</Text>
          </Pressable>
          <Pressable style={styles.socialBtn}>
            <FontAwesome5 name="google" size={18} color={DS.color.text} brand />
            <Text style={styles.socialBtnText}>Continue with Google</Text>
          </Pressable>
          <View style={styles.loginRow}>
            <Text style={styles.loginMuted}>Already have an account? </Text>
            <Pressable onPress={() => navigation.navigate('LogIn')}>
              <Text style={styles.loginGold}>Log In</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  splashOuter: {
    flex: 1,
    backgroundColor: DS.color.background,
  },
  splashClose: {
    position: 'absolute',
    right: DS.space.lg,
    zIndex: 2,
    padding: DS.space.sm,
  },
  splashRoot: {
    flex: 1,
    backgroundColor: DS.color.background,
    paddingHorizontal: DS.space.lg,
  },
  splashCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  logoOuter: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: DS.color.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: DS.space.lg,
    overflow: 'hidden',
    backgroundColor: DS.color.goldTint10,
  },
  splashLogo: {
    width: 120,
    height: 120,
  },
  splashSubtitle: {
    fontFamily: DS.font.heading,
    fontSize: 18,
    color: DS.color.text,
    textAlign: 'center',
    letterSpacing: 5.4,
    textTransform: 'uppercase',
    marginBottom: DS.space.sm,
  },
  splashBody: {
    fontFamily: DS.font.body,
    fontSize: 14,
    color: DS.color.textMuted,
    textAlign: 'center',
    maxWidth: 280,
    marginTop: DS.space.base,
    lineHeight: 22,
    fontWeight: '300',
  },
  splashFooter: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: DS.space.xl,
  },
  splashHint: {
    fontFamily: DS.font.body,
    fontSize: 12,
    color: DS.color.textMuted,
  },
  signupRoot: {
    flex: 1,
    backgroundColor: DS.color.background,
    paddingHorizontal: DS.space.lg,
  },
  signupKeyboard: {
    flex: 1,
  },
  signupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: DS.space.xl,
    paddingTop: DS.space.base,
  },
  signupBack: { width: 40 },
  signupHeaderSpacer: { width: 40 },
  signupHeading: {
    flex: 1,
    fontFamily: DS.font.heading,
    textAlign: 'center',
    fontSize: 30,
    color: DS.color.text,
    letterSpacing: DS.type.headingLetterSpacing,
    marginRight: -8,
  },
  signupScroll: {
    flexGrow: 1,
  },
  fieldBlock: {
    marginBottom: DS.space.lg,
  },
  label: {
    fontFamily: DS.font.bodyMedium,
    fontSize: DS.type.labelUppercaseSize,
    fontWeight: '700',
    color: DS.color.gold,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: DS.space.sm,
  },
  inputShell: {
    backgroundColor: DS.color.input,
    borderRadius: DS.radius.lg,
    padding: DS.space.base,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  textInput: {
    fontFamily: DS.font.body,
    fontSize: 16,
    color: DS.color.text,
    padding: 0,
  },
  inputShellRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DS.color.input,
    borderRadius: DS.radius.lg,
    paddingHorizontal: DS.space.base,
    paddingVertical: DS.space.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  textInputFlex: {
    flex: 1,
    marginRight: DS.space.sm,
  },
  ghostBtn: {
    width: '100%',
    paddingVertical: DS.space.base,
    borderRadius: DS.radius.lg,
    borderWidth: 1,
    borderColor: DS.color.border,
    alignItems: 'center',
    marginTop: DS.space.lg,
  },
  ghostBtnText: {
    fontFamily: DS.font.heading,
    fontSize: 20,
    color: DS.color.text,
    letterSpacing: DS.type.headingLetterSpacing,
    textTransform: 'uppercase',
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.space.base,
    marginVertical: DS.space.lg,
  },
  orLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: DS.color.border,
    opacity: 0.3,
  },
  orText: {
    fontSize: 14,
    color: DS.color.textMuted,
  },
  socialBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: DS.space.md,
    paddingVertical: DS.space.base,
    backgroundColor: DS.color.surface,
    borderRadius: DS.radius.lg,
    marginBottom: DS.space.base,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  socialBtnText: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 16,
    color: DS.color.text,
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: DS.space.lg,
  },
  loginMuted: {
    fontFamily: DS.font.body,
    color: DS.color.textMuted,
    fontSize: 15,
  },
  loginGold: {
    fontFamily: DS.font.bodyMedium,
    color: DS.color.gold,
    fontSize: 15,
    fontWeight: '600',
  },
});
