import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { requireNativeViewManager } from 'expo-modules-core';
import { canAddAppleWalletPass, isAppleWalletPassNativeAvailable } from 'apple-wallet-pass';
import { DS } from '../designSystem';
import { addEventPassToAppleWallet } from '../lib/walletPass';

type NativeProps = {
  onPress?: (event: { nativeEvent: Record<string, never> }) => void;
  buttonStyle?: 'black' | 'outline';
  style?: StyleProp<ViewStyle>;
};

const NativeAddPassButton =
  Platform.OS === 'ios' ? requireNativeViewManager<NativeProps>('AppleWalletPass') : null;

type Props = {
  bookingId: string;
  reference?: string;
  style?: StyleProp<ViewStyle>;
  /** `outline` on very dark backgrounds per Apple Wallet badge guidelines. */
  buttonStyle?: 'black' | 'outline';
};

/**
 * PKAddPassButton wrapper — required for in-app Wallet actions (not a custom badge).
 */
export function AddToAppleWalletButton({
  bookingId,
  reference,
  style,
  buttonStyle = 'black',
}: Props) {
  const [busy, setBusy] = useState(false);

  const onPress = useCallback(async () => {
    if (busy || !bookingId) return;
    setBusy(true);
    try {
      await addEventPassToAppleWallet({ bookingId, reference });
    } finally {
      setBusy(false);
    }
  }, [bookingId, busy, reference]);

  if (Platform.OS !== 'ios') return null;

  if (!isAppleWalletPassNativeAvailable() || !canAddAppleWalletPass()) {
    return (
      <Text style={styles.fallback}>
        To add this ticket to Wallet, open this booking on your iPhone.
      </Text>
    );
  }

  if (!NativeAddPassButton) return null;

  return (
    <View style={[styles.wrap, style]}>
      <NativeAddPassButton
        buttonStyle={buttonStyle}
        style={styles.button}
        onPress={() => void onPress()}
      />
      {busy ? (
        <View style={styles.busyOverlay} pointerEvents="none">
          <ActivityIndicator color={DS.color.gold} />
        </View>
      ) : null}
      <Text style={styles.hint}>Store your event ticket in the Wallet app on this iPhone.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    maxWidth: 320,
    alignSelf: 'center',
    marginBottom: DS.space.md,
  },
  button: {
    width: '100%',
    height: 44,
  },
  busyOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10,10,10,0.35)',
    borderRadius: 8,
  },
  hint: {
    marginTop: DS.space.sm,
    fontFamily: DS.font.body,
    fontSize: 12,
    lineHeight: 17,
    color: DS.color.textMuted,
    textAlign: 'center',
  },
  fallback: {
    fontFamily: DS.font.body,
    fontSize: 13,
    lineHeight: 18,
    color: DS.color.textMuted,
    marginBottom: DS.space.md,
    textAlign: 'center',
  },
});
