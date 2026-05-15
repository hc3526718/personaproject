import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, type PressableProps, type ViewStyle } from 'react-native';
import { AppLoadingIndicator } from './AppLoadingIndicator';
import { DS } from '../designSystem';

type Variant = 'primary' | 'secondary' | 'ghost' | 'social';

type Props = Omit<PressableProps, 'style' | 'children'> & {
  children: ReactNode;
  variant?: Variant;
  style?: ViewStyle | ViewStyle[];
  loading?: boolean;
  /** iOS-style large action; set false for compact rows */
  large?: boolean;
};

/**
 * Apple / HeroUI-adjacent controls on the Dalton dark canvas — rounded, high contrast, clear hit targets.
 */
export function AppleHeroButton({
  children,
  variant = 'primary',
  style,
  disabled,
  loading,
  large = true,
  ...rest
}: Props) {
  const minH = large ? DS.apple.controlHeight : 44;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        { minHeight: minH, borderRadius: DS.apple.radiusButton },
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'ghost' && styles.ghost,
        variant === 'social' && styles.social,
        pressed && !disabled && !loading && styles.pressed,
        (disabled || loading) && styles.disabled,
        variant === 'primary' && DS.apple.shadowButton,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <AppLoadingIndicator size={24} />
      ) : typeof children === 'string' ? (
        <Text
          style={[
            styles.label,
            variant === 'primary' && styles.labelPrimary,
            variant === 'secondary' && styles.labelSecondary,
            variant === 'ghost' && styles.labelGhost,
            variant === 'social' && styles.labelSocial,
          ]}
          numberOfLines={1}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: DS.space.lg,
  },
  primary: {
    backgroundColor: DS.color.gold,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: DS.color.goldTint90,
  },
  ghost: {
    backgroundColor: DS.apple.fillSecondary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: DS.apple.separator,
  },
  social: {
    backgroundColor: DS.color.surface,
    borderWidth: 1,
    borderColor: DS.apple.separator,
  },
  pressed: {
    opacity: 0.88,
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  labelPrimary: {
    color: DS.color.background,
  },
  labelSecondary: {
    color: DS.color.gold,
  },
  labelGhost: {
    color: DS.color.text,
  },
  labelSocial: {
    color: DS.color.text,
    fontWeight: '600',
  },
});
