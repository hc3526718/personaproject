import { useCallback, useRef } from 'react';
import { InteractionManager } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

type Options = {
  /** Wait until navigation transitions finish before loading (default true). */
  defer?: boolean;
};

/**
 * Run a reload when a screen gains focus without blocking the transition frame.
 */
export function useFocusReload(load: () => void | Promise<void>, options?: Options) {
  const defer = options?.defer !== false;
  const loadRef = useRef(load);
  loadRef.current = load;

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      const run = () => {
        if (alive) void loadRef.current();
      };

      if (defer) {
        const task = InteractionManager.runAfterInteractions(run);
        return () => {
          alive = false;
          task.cancel();
        };
      }

      run();
      return () => {
        alive = false;
      };
    }, [defer]),
  );
}
