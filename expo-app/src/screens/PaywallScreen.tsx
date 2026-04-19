import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppleHeroButton } from '../components/AppleHeroButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { DS } from '../designSystem';
import { useSubscription } from '../subscriptions/SubscriptionContext';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Paywall'>;

export function PaywallScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { isPro, busy, refresh, restore } = useSubscription();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader title="Premium" onBack={() => navigation.goBack()} largeTitle />
      <ScrollView contentContainerStyle={styles.body}>
        {busy ? (
          <ActivityIndicator color={DS.color.gold} style={{ marginTop: 24 }} />
        ) : (
          <>
            <Text style={styles.lead}>
              Premium includes unlimited saved events, early booking windows, offline media, and an
              ad-free experience (configure products in App Store Connect / Play Console + RevenueCat).
            </Text>
            <View style={styles.card}>
              <Text style={styles.status}>
                Status: {isPro ? 'Premium active' : 'Free plan'}
              </Text>
            </View>
            <AppleHeroButton onPress={() => void refresh()} style={styles.btnSpaced}>
              Refresh entitlements
            </AppleHeroButton>
            <AppleHeroButton variant="secondary" onPress={() => void restore()}>
              Restore purchases
            </AppleHeroButton>
            <Text style={styles.hint}>
              In Expo Go, store billing is unavailable — use an EAS development build with RevenueCat
              keys set in .env
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
  btnSpaced: { marginBottom: DS.space.md },
  hint: {
    marginTop: DS.space.xl,
    fontFamily: DS.font.body,
    fontSize: 12,
    color: DS.color.textMuted,
    lineHeight: 18,
  },
});
