import { useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '../components/ScreenHeader';
import { AppleHeroButton } from '../components/AppleHeroButton';
import { DS } from '../designSystem';
import { useAuth } from '../auth/AuthContext';
import { MFA_APP_LABEL, verifyMfaLoginCode } from '../auth/mfaService';

export function MfaChallengeScreen() {
  const insets = useSafeAreaInsets();
  const { clearMfaStepUp, logout, sessionEmail } = useAuth();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    const result = await verifyMfaLoginCode(code);
    setBusy(false);
    if (!result.ok) {
      Alert.alert('Invalid code', result.message);
      return;
    }
    clearMfaStepUp();
  };

  const cancel = () => {
    Alert.alert('Sign out?', 'You need to complete two-factor authentication to continue.', [
      { text: 'Stay', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => void logout(),
      },
    ]);
  };

  return (
    <View style={styles.root}>
      <ScreenHeader title="Two-factor auth" onBack={cancel} />
      <ScrollView
        contentContainerStyle={[styles.pad, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.iconCircle}>
          <FontAwesome name="shield" size={28} color={DS.color.gold} />
        </View>
        <Text style={styles.title}>Enter your 6-digit code</Text>
        <Text style={styles.body}>
          Open your authenticator app, choose the entry named{' '}
          <Text style={styles.strong}>{MFA_APP_LABEL}</Text>
          {sessionEmail ? ` for ${sessionEmail}` : ''}, and enter the current 6-digit code below.
        </Text>
        <TextInput
          style={styles.input}
          value={code}
          onChangeText={setCode}
          placeholder="000000"
          placeholderTextColor={DS.color.textMuted}
          keyboardType="number-pad"
          maxLength={6}
          autoFocus
          autoComplete={Platform.OS === 'web' ? 'one-time-code' : undefined}
        />
        <AppleHeroButton loading={busy} onPress={() => void submit()}>
          Verify
        </AppleHeroButton>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DS.color.background },
  pad: { padding: DS.space.lg, alignItems: 'stretch' },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(200, 168, 75, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: DS.space.lg,
  },
  title: {
    fontFamily: DS.font.bodyBold,
    fontSize: 20,
    color: DS.color.text,
    textAlign: 'center',
    marginBottom: DS.space.sm,
  },
  body: {
    fontFamily: DS.font.body,
    fontSize: 15,
    color: DS.color.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: DS.space.lg,
  },
  strong: {
    fontFamily: DS.font.bodyBold,
    color: DS.color.gold,
  },
  input: {
    borderWidth: 1,
    borderColor: DS.color.borderHairline,
    borderRadius: DS.apple.radiusField,
    paddingHorizontal: DS.space.md,
    paddingVertical: 14,
    fontFamily: DS.font.body,
    fontSize: 22,
    color: DS.color.text,
    letterSpacing: 6,
    textAlign: 'center',
    marginBottom: DS.space.lg,
  },
});
