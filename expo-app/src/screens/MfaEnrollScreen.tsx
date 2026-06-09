import { useCallback, useRef, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FontAwesome } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';
import { ScreenHeader } from '../components/ScreenHeader';
import { AppleHeroButton } from '../components/AppleHeroButton';
import { AppLoadingIndicator } from '../components/AppLoadingIndicator';
import { DS } from '../designSystem';
import type { ProfileStackParamList } from '../navigation/types';
import {
  completeTotpEnrollment,
  fetchTotpFactors,
  startTotpEnrollment,
  type TotpEnrollStart,
} from '../auth/mfaService';
import { isStaffAccount } from '../auth/staffAccess';
import { useAuth } from '../auth/AuthContext';

type Props = NativeStackScreenProps<ProfileStackParamList, 'MfaEnroll'>;

export function MfaEnrollScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const required = route.params?.required === true;
  const [loading, setLoading] = useState(true);
  const [enroll, setEnroll] = useState<TotpEnrollStart | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [alreadyEnrolled, setAlreadyEnrolled] = useState(false);
  const startedRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    const factors = await fetchTotpFactors();
    if (factors.length > 0) {
      setAlreadyEnrolled(true);
      setEnroll(null);
      setLoading(false);
      return;
    }
    if (startedRef.current && enroll) {
      setLoading(false);
      return;
    }
    const started = await startTotpEnrollment();
    setLoading(false);
    if (!started.ok) {
      Alert.alert('MFA setup', started.message);
      if (!required) navigation.goBack();
      return;
    }
    startedRef.current = true;
    setEnroll(started.enroll);
  }, [enroll, navigation, required]);

  useFocusEffect(
    useCallback(() => {
      if (!user?.id || user.id.startsWith('demo-')) {
        Alert.alert('Sign in required', 'MFA enrollment works for live accounts only.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
        return undefined;
      }
      if (!isStaffAccount(user)) {
        Alert.alert(
          'Staff only',
          'Two-factor authentication enrollment is for master and staff accounts.',
          [{ text: 'OK', onPress: () => navigation.goBack() }],
        );
        return undefined;
      }
      void load();
      return undefined;
    }, [load, navigation, user]),
  );

  const submit = async () => {
    if (!enroll || busy) return;
    setBusy(true);
    const result = await completeTotpEnrollment(enroll.factorId, code);
    setBusy(false);
    if (!result.ok) {
      Alert.alert('Verification failed', result.message);
      return;
    }
    Alert.alert(
      'Authenticator enrolled',
      'Your account now requires a code from your authenticator app when signing in.',
      [{ text: 'OK', onPress: () => navigation.goBack() }],
    );
  };

  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Authenticator app"
        onBack={required ? undefined : () => navigation.goBack()}
        largeTitle
      />
      <ScrollView
        contentContainerStyle={[styles.pad, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {required ? (
          <View style={styles.banner}>
            <FontAwesome name="shield" size={18} color={DS.color.gold} />
            <Text style={styles.bannerText}>
              Master and staff accounts must enroll two-factor authentication before using Master
              Control.
            </Text>
          </View>
        ) : null}

        {loading ? (
          <AppLoadingIndicator size={32} />
        ) : alreadyEnrolled ? (
          <View style={styles.card}>
            <Text style={styles.title}>Already enrolled</Text>
            <Text style={styles.body}>
              This account has an authenticator app linked. You will be asked for a code when you
              sign in.
            </Text>
          </View>
        ) : enroll ? (
          <>
            <Text style={styles.body}>
              Scan the QR code with Google Authenticator, 1Password, Authy, or another TOTP app.
              Then enter the 6-digit code to finish setup.
            </Text>
            <View style={styles.qrWrap}>
              <SvgXml xml={enroll.qrSvg} width={200} height={200} />
            </View>
            <Text style={styles.secretLabel}>Manual entry key</Text>
            <Text selectable style={styles.secret}>
              {enroll.secret}
            </Text>
            <Text style={styles.label}>6-digit code</Text>
            <TextInput
              style={styles.input}
              value={code}
              onChangeText={setCode}
              placeholder="000000"
              placeholderTextColor={DS.color.textMuted}
              keyboardType="number-pad"
              maxLength={6}
              autoComplete={Platform.OS === 'web' ? 'one-time-code' : undefined}
            />
            <AppleHeroButton loading={busy} onPress={() => void submit()}>
              Verify & enable
            </AppleHeroButton>
          </>
        ) : null}

        {!required ? (
          <Pressable style={styles.cancel} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DS.color.background },
  pad: { padding: DS.space.lg, gap: DS.space.md },
  banner: {
    flexDirection: 'row',
    gap: DS.space.sm,
    padding: DS.space.md,
    borderRadius: DS.apple.radiusCard,
    borderWidth: 1,
    borderColor: 'rgba(200, 168, 75, 0.45)',
    backgroundColor: 'rgba(200, 168, 75, 0.1)',
    alignItems: 'flex-start',
  },
  bannerText: {
    flex: 1,
    fontFamily: DS.font.body,
    fontSize: 14,
    color: DS.color.text,
    lineHeight: 20,
  },
  card: {
    padding: DS.space.lg,
    borderRadius: DS.apple.radiusCard,
    backgroundColor: DS.color.panel,
    borderWidth: 1,
    borderColor: DS.color.borderHairline,
  },
  title: {
    fontFamily: DS.font.bodyBold,
    fontSize: 17,
    color: DS.color.text,
    marginBottom: DS.space.sm,
  },
  body: {
    fontFamily: DS.font.body,
    fontSize: 15,
    color: DS.color.textMuted,
    lineHeight: 22,
  },
  qrWrap: {
    alignSelf: 'center',
    padding: DS.space.md,
    backgroundColor: '#ffffff',
    borderRadius: 12,
  },
  secretLabel: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 13,
    color: DS.color.textMuted,
    marginTop: DS.space.sm,
  },
  secret: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 14,
    color: DS.color.text,
    letterSpacing: 1,
  },
  label: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 14,
    color: DS.color.text,
    marginTop: DS.space.md,
  },
  input: {
    borderWidth: 1,
    borderColor: DS.color.borderHairline,
    borderRadius: DS.apple.radiusControl,
    paddingHorizontal: DS.space.md,
    paddingVertical: 12,
    fontFamily: DS.font.body,
    fontSize: 18,
    color: DS.color.text,
    letterSpacing: 4,
    textAlign: 'center',
  },
  cancel: { alignSelf: 'center', marginTop: DS.space.md, padding: DS.space.sm },
  cancelText: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 14,
    color: DS.color.textMuted,
    textDecorationLine: 'underline',
  },
});
