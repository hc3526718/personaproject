import { InteractionManager, Platform } from 'react-native';

/** Run native-touching setup after the first frame (reduces release-only aborts right after splash). */
export function runAfterFirstFrame(task: () => void): void {
  if (Platform.OS === 'web') {
    task();
    return;
  }
  InteractionManager.runAfterInteractions(() => {
    try {
      task();
    } catch (e) {
      if (__DEV__) console.warn('[boot] deferred task failed', e);
    }
  });
}
