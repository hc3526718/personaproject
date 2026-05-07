import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppleHeroButton } from '../components/AppleHeroButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { DS } from '../designSystem';
import { useSubscription } from '../subscriptions/SubscriptionContext';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../navigation/types';
import { getRevenueCatEntitlementId } from '../lib/env';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Paywall'>;

export function PaywallScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { isPro, busy, refresh, restore } = useSubscription();
  const entitlementId = getRevenueCatEntitlementId();

  const presentPaywall = async () => {
    try {
      const ui = require('react-native-purchases-ui') as typeof import('react-native-purchases-ui');
      // Present current offering paywall
      const result = await ui.RevenueCatUI.presentPaywall();
      if (__DEV__) console.warn('[RevenueCatUI] paywall result', result);
      await refresh();
    } catch (e) {
      Alert.alert('Paywall', e instanceof Error ? e.message : 'Could not open paywall');
    }
  };

  const openCustomerCenter = async () => {
    try {
      const ui = require('react-native-purchases-ui') as typeof import('react-native-purchases-ui');
      await ui.RevenueCatUI.presentCustomerCenter();
    } catch (e) {
      Alert.alert('Customer Center', e instanceof Error ? e.message : 'Could not open customer center');
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader title="Premium" onBack={() => navigation.goBack()} largeTitle />
      <ScrollView contentContainerStyle={styles.body}>
        {busy ? (
          <ActivityIndicator color={DS.color.gold} style={{ marginTop: 24 }} />
        ) : (
          <>
            <Text style={styles.demoKicker}>Preview</Text>
            <Text style={styles.lead}>
              Premium unlocks host check-in QR scanning on the Events tab plus creating events and uploading
              media — all synced with RevenueCat soon. Pricing and plans will appear here after you plug in
              your products.
            </Text>
            <View style={styles.card}>
              <Text style={styles.status}>
                Status: {isPro ? 'Premium active' : 'Regular · free'}
              </Text>
              <Text style={styles.meta}>Entitlement: {entitlementId || 'premium'}</Text>
            </View>
            <AppleHeroButton
              variant="secondary"
              onPress={() => navigation.goBack()}
              style={styles.btnSpaced}
            >
              Continue with current plan
            </AppleHeroButton>
            <AppleHeroButton onPress={() => void presentPaywall()} style={styles.btnSpaced}>
              View plans
            </AppleHeroButton>
            <AppleHeroButton onPress={() => void refresh()} style={styles.btnSpaced}>
              Refresh entitlements
            </AppleHeroButton>
            <AppleHeroButton variant="secondary" onPress={() => void restore()}>
              Restore purchases
            </AppleHeroButton>
            <AppleHeroButton variant="secondary" onPress={() => void openCustomerCenter()} style={styles.btnSpaced}>
              Manage subscription
            </AppleHeroButton>
            <Text style={styles.hint}>
              RevenueCat integration is optional in development. Use an EAS build with billing keys when you
              are ready for real purchases.
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DS.color.background },
  body: { padding: DS.space.lg, paddingBottom: 48 },
  demoKicker: {
    alignSelf: 'flex-start',
    fontFamily: DS.font.bodyMedium,
    fontSize: 11,
    letterSpacing: 2,
    color: DS.color.gold,
    textTransform: 'uppercase',
    marginBottom: DS.space.sm,
  },
  lead: {
    fontFamily: DS.font.body,
    fontSize: 15,
    color: DS.color.textMuted,
    lineHeight: 22,
    marginBottom: DS.space.lg,
  },
  card: {
    backgroundColor: DS.color.surface,
    borderRadius: 12,
    padding: DS.space.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: DS.color.borderWhite5,
    marginBottom: DS.space.lg,
  },
  status: { fontFamily: DS.font.bodyMedium, fontSize: 16, color: DS.color.text },
  meta: {
    marginTop: DS.space.sm,
    fontFamily: DS.font.body,
    fontSize: 12,
    color: DS.color.textMuted,
  },
  btnSpaced: { marginBottom: DS.space.md },
  hint: {
    marginTop: DS.space.xl,
    fontFamily: DS.font.body,
    fontSize: 12,
    color: DS.color.textMuted,
    lineHeight: 18,
  },
});
