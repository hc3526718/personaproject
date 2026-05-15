import { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppLoadingIndicator } from '../components/AppLoadingIndicator';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import { DS } from '../designSystem';
import { presentRevenueCatCustomerCenter, presentRevenueCatPaywall } from '../subscriptions/presentRevenueCatPaywall';
import { useSubscription } from '../subscriptions/SubscriptionContext';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Paywall'>;

export function PaywallScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { busy, refresh, restore, notifyNewPremiumFromPaywall } = useSubscription();
  const [presenting, setPresenting] = useState(false);
  const paywallBusy = useRef(false);

  const showRevenueCatPaywall = useCallback(async () => {
    if (paywallBusy.current) return;
    paywallBusy.current = true;
    setPresenting(true);
    try {
      const { premiumActivated } = await presentRevenueCatPaywall();
      await refresh();
      if (premiumActivated) notifyNewPremiumFromPaywall(true);
    } finally {
      paywallBusy.current = false;
      setPresenting(false);
    }
  }, [refresh, notifyNewPremiumFromPaywall]);

  useFocusEffect(
    useCallback(() => {
      void showRevenueCatPaywall();
    }, [showRevenueCatPaywall]),
  );

  const openCustomerCenter = async () => {
    await presentRevenueCatCustomerCenter();
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={12}
          onPress={() => navigation.goBack()}
          style={styles.iconHit}
        >
          <FontAwesome name="chevron-left" size={22} color={DS.color.gold} />
        </Pressable>
        <Text style={styles.topTitle}>Premium</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.center}>
        {busy || presenting ? (
          <AppLoadingIndicator />
        ) : (
          <>
            <Text style={styles.lead}>
              Subscription options use your RevenueCat Paywall templates. Tap below if the sheet did not open
              (e.g. Expo Go or store billing not configured).
            </Text>
            <Pressable style={styles.primaryBtn} onPress={() => void showRevenueCatPaywall()}>
              <Text style={styles.primaryBtnText}>View plans</Text>
            </Pressable>
            <Pressable style={styles.linkBtn} onPress={() => void openCustomerCenter()}>
              <Text style={styles.linkTxt}>Manage subscription</Text>
            </Pressable>
            <Pressable style={styles.linkBtn} onPress={() => void restore().then((gained) => {
              if (gained) notifyNewPremiumFromPaywall(true);
            })}>
              <Text style={styles.linkTxt}>Restore purchases</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: DS.space.base,
    paddingBottom: DS.space.sm,
  },
  iconHit: { padding: DS.space.xs },
  topTitle: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 16,
    color: DS.color.mist,
  },
  center: {
    flex: 1,
    paddingHorizontal: DS.space.xl,
    justifyContent: 'center',
    alignItems: 'stretch',
    gap: DS.space.md,
  },
  lead: {
    fontFamily: DS.font.body,
    fontSize: 14,
    color: DS.color.textMuted,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: DS.space.md,
  },
  primaryBtn: {
    backgroundColor: DS.color.gold,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 16,
    color: DS.color.background,
    fontWeight: '700',
  },
  linkBtn: { paddingVertical: 12, alignItems: 'center' },
  linkTxt: {
    fontFamily: DS.font.body,
    fontSize: 15,
    color: DS.color.gold,
  },
});
