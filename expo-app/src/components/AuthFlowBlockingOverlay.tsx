import { Modal, StyleSheet, Text, View } from 'react-native';
import { AppLoadingIndicator } from './AppLoadingIndicator';
import { DS } from '../designSystem';

type Props = {
  visible: boolean;
  message?: string;
};

/** Full-screen blocker so auth flows finish one at a time (no double-tap / stacked navigation). */
export function AuthFlowBlockingOverlay({ visible, message = 'Please wait…' }: Props) {
  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={() => {}}>
      <View style={styles.scrim} accessibilityRole="progressbar" accessibilityLabel={message}>
        <AppLoadingIndicator />
        <Text style={styles.message}>{message}</Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: DS.color.overlayDark80,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: DS.space.xl,
    gap: DS.space.lg,
  },
  message: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 15,
    color: DS.color.textMuted,
    textAlign: 'center',
  },
});
