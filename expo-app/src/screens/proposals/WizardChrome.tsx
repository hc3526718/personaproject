import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DS } from '../../designSystem';

type Props = {
  title: string;
  step: number;
  totalSteps: number;
  onBack: () => void;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  children: ReactNode;
};

export function WizardChrome({
  title,
  step,
  totalSteps,
  onBack,
  onNext,
  nextLabel = 'Continue',
  nextDisabled,
  children,
}: Props) {
  const insets = useSafeAreaInsets();
  const progress = Math.min(1, step / totalSteps);

  return (
    <View style={styles.root}>
      <View style={[styles.top, { paddingTop: insets.top + DS.space.md }]}>
        <Pressable onPress={onBack} hitSlop={12} style={styles.back}>
          <FontAwesome name="chevron-left" size={20} color={DS.color.gold} />
        </Pressable>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.stepLabel}>
          {step}/{totalSteps}
        </Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>
      <View style={styles.body}>{children}</View>
      {onNext ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + DS.space.md }]}>
          <Pressable
            style={[styles.nextBtn, nextDisabled && styles.nextBtnDisabled]}
            disabled={nextDisabled}
            onPress={onNext}
          >
            <Text style={styles.nextBtnText}>{nextLabel}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DS.color.background },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: DS.space.base,
    gap: DS.space.sm,
  },
  back: { padding: DS.space.xs },
  title: {
    flex: 1,
    fontFamily: DS.font.heading,
    fontSize: 22,
    color: DS.color.gold,
    letterSpacing: 1,
  },
  stepLabel: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 13,
    color: DS.color.textMuted,
  },
  progressTrack: {
    height: 3,
    backgroundColor: DS.color.input,
    marginTop: DS.space.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: DS.color.gold,
  },
  body: {
    flex: 1,
    paddingHorizontal: DS.space.base,
    paddingTop: DS.space.lg,
  },
  footer: {
    paddingHorizontal: DS.space.base,
    paddingTop: DS.space.md,
  },
  nextBtn: {
    backgroundColor: DS.color.gold,
    paddingVertical: 14,
    borderRadius: DS.radius.xl,
    alignItems: 'center',
  },
  nextBtnDisabled: { opacity: 0.45 },
  nextBtnText: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 16,
    fontWeight: '700',
    color: DS.color.background,
  },
});
