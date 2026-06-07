import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { BOOT_TRACE_ENABLED, subscribeBootTrace } from './bootTrace';

/** On-screen boot log for release builds (console is not visible on device). */
export function BootTraceOverlay() {
  const [lines, setLines] = useState<readonly string[]>([]);

  useEffect(() => {
    if (!BOOT_TRACE_ENABLED) return;
    return subscribeBootTrace(setLines);
  }, []);

  if (!BOOT_TRACE_ENABLED || lines.length === 0) return null;

  return (
    <View style={styles.wrap} pointerEvents="none">
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {lines.map((line, i) => (
          <Text key={`${i}-${line}`} style={styles.line}>
            {line}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 28,
    maxHeight: '42%',
    zIndex: 9999,
    backgroundColor: 'rgba(0,0,0,0.82)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(200,168,75,0.35)',
  },
  scroll: { flexGrow: 0 },
  content: { padding: 8, gap: 2 },
  line: {
    fontFamily: 'Menlo',
    fontSize: 10,
    color: '#C8A84B',
    lineHeight: 14,
  },
});
