import { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FontAwesome } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthContext';
import { AppLoadingIndicator } from '../components/AppLoadingIndicator';
import { AppButton } from '../components/ui/AppButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { DS } from '../designSystem';
import type { EventsStackParamList } from '../navigation/types';
import { useSubscription } from '../subscriptions/SubscriptionContext';
import { hasPremiumOrAdminTier } from '../subscriptions/navigateToPremiumPaywall';
import { gatePremiumFeatureAccess } from '../subscriptions/premiumFeatureGate';
import { CreateEventWizard } from './CreateEventWizard';

type Props = NativeStackScreenProps<EventsStackParamList, 'CreateEvent'>;

export function CreateEventScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { isPro, refresh: refreshSubscription, notifyNewPremiumFromPaywall } = useSubscription();
  const tierOk = hasPremiumOrAdminTier(isPro, user?.role);
  const verified = !!user?.daltonVerified;

  useFocusEffect(
    useCallback(() => {
      if (tierOk) return undefined;
      let cancelled = false;
      void (async () => {
        const allowed = await gatePremiumFeatureAccess({
          navigation,
          isPro,
          user,
          refreshSubscription,
          notifyNewPremiumFromPaywall,
        });
        if (cancelled || allowed !== 'allowed') {
          if (!cancelled) navigation.goBack();
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [
      tierOk,
      navigation,
      refreshSubscription,
      user?.role,
      notifyNewPremiumFromPaywall,
    ]),
  );

  if (!tierOk) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <ScreenHeader title="Create event" onBack={() => navigation.goBack()} />
        <View style={styles.gateBody}>
          <AppLoadingIndicator />
          <Text style={[styles.gateTxt, { marginTop: DS.space.lg, textAlign: 'center' }]}>
            Opening subscription options…
          </Text>
        </View>
      </View>
    );
  }

  if (!verified) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <ScreenHeader title="Create event" onBack={() => navigation.goBack()} />
        <View style={styles.gateBody}>
          <FontAwesome name="file-text-o" size={40} color={DS.color.gold} />
          <Text style={styles.gateTitle}>Submit an event proposal</Text>
          <Text style={styles.gateTxt}>
            Verified hosts can publish events instantly. Until then, submit a step-by-step proposal for the Dalton
            team to review.
          </Text>
          <AppButton
            label="Start event proposal"
            onPress={() => navigation.replace('EventProposalWizard')}
          />
          <AppButton label="Back" onPress={() => navigation.goBack()} variant="secondary" />
        </View>
      </View>
    );
  }

  return <CreateEventWizard navigation={navigation} />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DS.color.background },
  gateBody: {
    flex: 1,
    padding: DS.space.xl,
    justifyContent: 'center',
    gap: DS.space.lg,
  },
  gateTitle: {
    fontFamily: DS.font.heading,
    fontSize: 28,
    color: DS.color.text,
    letterSpacing: 1,
  },
  gateTxt: { fontFamily: DS.font.body, fontSize: 15, color: DS.color.textMuted, lineHeight: 22 },
});
