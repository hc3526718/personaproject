import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { DS } from '../designSystem';

const SIZE = 52;
const STROKE = 3;
const R = (SIZE - STROKE) / 2;
const CX = SIZE / 2;
const CY = SIZE / 2;
const CIRC = 2 * Math.PI * R;
/** One continuous gold arc; gap keeps a single sweeping segment on the full ring */
const ARC_LEN = CIRC * 0.26;

/**
 * Full circular track with one gold arc rotating smoothly (no segmented pills).
 */
export function BootCircleLoader() {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 980,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.wrap} accessibilityRole="progressbar" accessibilityLabel="Loading">
      <Animated.View style={[styles.spin, { transform: [{ rotate }] }]}>
        <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <Circle
            cx={CX}
            cy={CY}
            r={R}
            stroke={DS.color.borderHairline}
            strokeWidth={STROKE}
            fill="none"
            opacity={0.45}
          />
          <Circle
            cx={CX}
            cy={CY}
            r={R}
            stroke={DS.color.gold}
            strokeWidth={STROKE}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${ARC_LEN} ${CIRC}`}
            rotation={-90}
            origin={`${CX}, ${CY}`}
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: DS.space.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spin: {
    width: SIZE,
    height: SIZE,
  },
});
