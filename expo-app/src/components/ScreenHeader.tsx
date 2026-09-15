import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DS, tabRootTitleText } from '../designSystem';

type Props = {
  title: string;
  onBack?: () => void;
  right?: ReactNode;
  largeTitle?: boolean;
  /** Default: left-aligned (roadmap). Use `center` for rare exceptions. */
  titleAlign?: 'left' | 'center';
  titleColor?: string;
};

export function ScreenHeader({
  title,
  onBack,
  right,
  largeTitle,
  titleAlign = 'left',
  titleColor = DS.color.text,
}: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { paddingTop: insets.top + DS.space.md }]}>
      <View style={styles.row}>
        {onBack ? (
          <Pressable onPress={onBack} hitSlop={12} style={styles.backBtn}>
            <FontAwesome name="arrow-left" size={22} color={DS.color.text} />
          </Pressable>
        ) : (
          <View style={styles.backPlaceholder} />
        )}
        <Text
          style={[
            styles.title,
            tabRootTitleText,
            largeTitle && styles.titleLarge,
            { color: titleColor, textAlign: titleAlign },
          ]}
          numberOfLines={1}
        >
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
    paddingBottom: DS.space.base,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DS.apple.separator,
    backgroundColor: DS.color.background,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: DS.space.sm,
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
    fontWeight: '400',
    textTransform: 'uppercase',
  },
  titleLarge: {
    fontSize: 40,
    letterSpacing: 2.5,
  },
  rightSlot: {
    minWidth: 40,
    alignItems: 'flex-end',
  },
});
