import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FontAwesome } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DS, tabRootHeaderPadding, tabRootTitleText } from '../designSystem';
import type { SponsorsStackParamList } from '../navigation/types';

type SProps<K extends keyof SponsorsStackParamList> = NativeStackScreenProps<
  SponsorsStackParamList,
  K
>;

const SP_IMG =
  'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=600&auto=format&fit=crop';

export function SponsorListingsScreen({ navigation }: SProps<'SponsorListings'>) {
  const insets = useSafeAreaInsets();
  const items = [
    { name: 'NIKE ATHLETICS', tier: 'Official partner — equipment & camps' },
    { name: 'HYDRATE PRO', tier: 'Performance hydration systems' },
    { name: 'IRON FORGE', tier: 'Strength equipment & recovery' },
  ];
  return (
    <View style={styles.root}>
      <View
        style={[
          styles.sponsorHeader,
          tabRootHeaderPadding,
          { paddingTop: insets.top + DS.space.md },
        ]}
      >
        <Text style={styles.sponsorTitle}>SPONSORS</Text>
        <Pressable
          style={styles.sponsorBell}
          onPress={() =>
            navigation.getParent()?.navigate('Community', { screen: 'Notifications' })
          }
        >
          <FontAwesome name="bell-o" size={20} color={DS.color.text} />
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={[styles.padded, { paddingBottom: 100 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {items.map((s) => (
          <Pressable
            key={s.name}
            style={styles.sponsorCard}
            onPress={() => navigation.navigate('BrandPartner')}
          >
            <Image source={{ uri: SP_IMG }} style={styles.sponsorThumb} />
            <View style={{ flex: 1 }}>
              <Text style={styles.sponsorName}>{s.name}</Text>
              <Text style={styles.sponsorTier}>{s.tier}</Text>
            </View>
            <FontAwesome name="chevron-right" size={14} color={DS.color.textMuted} />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: DS.color.background,
  },
  sponsorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sponsorTitle: {
    ...tabRootTitleText,
  },
  sponsorBell: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: DS.color.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sponsorTier: {
    fontFamily: DS.font.body,
    fontSize: 13,
    color: DS.color.text,
    marginTop: 4,
  },
  padded: {
    padding: DS.space.lg,
  },
  sponsorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.space.md,
    backgroundColor: DS.color.surface,
    borderRadius: DS.radius.xl,
    padding: DS.space.md,
    marginBottom: DS.space.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: DS.color.cardBorder,
  },
  sponsorThumb: {
    width: 72,
    height: 72,
    borderRadius: DS.radius.md,
  },
  sponsorName: {
    fontFamily: DS.font.heading,
    fontSize: 18,
    letterSpacing: 1,
    color: DS.color.gold,
  },
});
