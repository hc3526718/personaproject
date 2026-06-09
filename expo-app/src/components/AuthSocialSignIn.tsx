import { Platform, StyleSheet, Text, View } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAuth } from '../auth/AuthContext';
import { AppleHeroButton } from './AppleHeroButton';
import { DS } from '../designSystem';

function socialLabelStyle() {
  return {
    fontFamily: DS.font.bodyMedium,
    fontSize: 16,
    fontWeight: '600' as const,
    color: DS.color.text,
  };
}

/** Apple + Google OAuth buttons shared across login and sign-up. */
export function AuthSocialSignIn() {
  const { signInWithGoogle, signInWithApple, oAuthBusy } = useAuth();

  return (
    <>
      <View style={styles.orRow}>
        <View style={styles.orLine} />
        <Text style={styles.orText}>OR</Text>
        <View style={styles.orLine} />
      </View>
      {Platform.OS === 'ios' ? (
        <AppleHeroButton
          variant="social"
          loading={oAuthBusy}
          onPress={() => void signInWithApple()}
          style={styles.socialBtn}
        >
          <View style={styles.socialInner}>
            <FontAwesome5 name="apple" size={20} color={DS.color.text} brand />
            <Text style={socialLabelStyle()}>Continue with Apple</Text>
          </View>
        </AppleHeroButton>
      ) : null}
      <AppleHeroButton
        variant="social"
        loading={oAuthBusy}
        onPress={() => void signInWithGoogle()}
        style={styles.socialBtn}
      >
        <View style={styles.socialInner}>
          <FontAwesome5 name="google" size={18} color={DS.color.text} brand />
          <Text style={socialLabelStyle()}>Continue with Google</Text>
        </View>
      </AppleHeroButton>
    </>
  );
}

const styles = StyleSheet.create({
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.space.md,
    marginVertical: DS.space.lg,
  },
  orLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: DS.apple.separator,
  },
  orText: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 12,
    color: DS.color.textMuted,
    letterSpacing: 2,
  },
  socialBtn: {
    marginBottom: DS.space.md,
  },
  socialInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.space.md,
  },
});
