import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { DS } from '../designSystem';
import { AppleHeroButton } from './AppleHeroButton';

type Props = {
  visible: boolean;
  onContinue: () => void;
};

/** One-time notice after TOTP enrollment — future sign-ins require the DGA code. */
export function MfaEnrolledNoticeModal({ visible, onContinue }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onContinue}>
      <Pressable style={styles.backdrop} onPress={onContinue}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>Authenticator enabled</Text>
          <Text style={styles.body}>
            From now on, whenever you sign in to your account you will need to enter the 6-digit code
            from your authenticator app under the name{' '}
            <Text style={styles.strong}>DGA</Text>.
          </Text>
          <Text style={styles.body}>
            Keep your phone handy after email/password or Google sign-in — you will be asked for the
            code before you can use the app.
          </Text>
          <AppleHeroButton onPress={onContinue}>Continue</AppleHeroButton>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: DS.space.lg,
  },
  sheet: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: DS.color.surface,
    borderRadius: DS.radius.xxl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: DS.color.borderWhite5,
    padding: DS.space.lg,
    gap: DS.space.md,
  },
  title: {
    fontFamily: DS.font.bodyBold,
    fontSize: 18,
    color: DS.color.text,
    textAlign: 'center',
  },
  body: {
    fontFamily: DS.font.body,
    fontSize: 15,
    color: DS.color.textMuted,
    lineHeight: 22,
    textAlign: 'center',
  },
  strong: {
    fontFamily: DS.font.bodyBold,
    color: DS.color.gold,
  },
});
