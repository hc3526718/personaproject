import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DS } from '../designSystem';

type Props = {
  title: string;
  onBack?: () => void;
  right?: ReactNode;
  largeTitle?: boolean;
};

export function ScreenHeader({ title, onBack, right, largeTitle }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { paddingTop: insets.top + DS.space.base }]}>
      <View style={styles.row}>
        {onBack ? (
          <Pressable onPress={onBack} hitSlop={12} style={styles.backBtn}>
            <FontAwesome name="arrow-left" size={22} color={DS.color.text} />
          </Pressable>
        ) : (
          <View style={styles.backPlaceholder} />
        )}
        <Text style={[styles.title, largeTitle && styles.titleLarge]} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.rightSlot}>{right}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: DS.space.lg,
    paddingBottom: DS.space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DS.color.borderHairline,
    backgroundColor: DS.color.background,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    alignItems: 'flex-start',
  },
  backPlaceholder: {
    width: 40,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontFamily: DS.font.heading,
    fontSize: 26,
    fontWeight: '400',
    color: DS.color.gold,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  titleLarge: {
    fontSize: 28,
  },
  rightSlot: {
    minWidth: 40,
    alignItems: 'flex-end',
  },
});
