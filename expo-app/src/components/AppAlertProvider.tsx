import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DS } from '../designSystem';
import {
  registerAppAlertBridge,
  type AppAlertButton,
} from '../lib/appAlert';

type AlertState = {
  title: string;
  message?: string;
  buttons: AppAlertButton[];
};

type PromptState = AlertState & {
  defaultValue: string;
  inputType: 'default' | 'plain-text' | 'secure-text';
};

export function AppAlertProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [alertState, setAlertState] = useState<AlertState | null>(null);
  const [promptState, setPromptState] = useState<PromptState | null>(null);
  const [promptValue, setPromptValue] = useState('');

  const closeAlert = useCallback(() => setAlertState(null), []);
  const closePrompt = useCallback(() => {
    setPromptState(null);
    setPromptValue('');
  }, []);

  const bridge = useMemo(
    () => ({
      alert: (title: string, message?: string, buttons?: AppAlertButton[]) => {
        const resolved = buttons?.length ? buttons : [{ text: 'OK' }];
        setAlertState({ title, message, buttons: resolved });
      },
      prompt: (
        title: string,
        message?: string,
        buttons?: AppAlertButton[],
        type: 'default' | 'plain-text' | 'secure-text' = 'plain-text',
        defaultValue = '',
      ) => {
        const resolved = buttons?.length ? buttons : [{ text: 'OK' }];
        setPromptValue(defaultValue);
        setPromptState({
          title,
          message,
          buttons: resolved,
          defaultValue,
          inputType: type,
        });
      },
    }),
    [],
  );

  useEffect(() => {
    registerAppAlertBridge(bridge);
    return () => registerAppAlertBridge(null);
  }, [bridge]);

  const runButton = useCallback(
    (btn: AppAlertButton, value?: string) => {
      closeAlert();
      closePrompt();
      try {
        if (value !== undefined && btn.onPress) {
          (btn.onPress as (text?: string) => void)(value);
        } else {
          btn.onPress?.();
        }
      } catch {
        /* ignore */
      }
    },
    [closeAlert, closePrompt],
  );

  return (
    <>
      {children}
      <Modal visible={alertState != null} transparent animationType="fade" onRequestClose={closeAlert}>
        <Pressable style={styles.scrim} onPress={closeAlert}>
          <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
            {alertState ? (
              <>
                <Text style={styles.title}>{alertState.title}</Text>
                {alertState.message ? <Text style={styles.message}>{alertState.message}</Text> : null}
                <View style={styles.actions}>
                  {alertState.buttons.map((btn, idx) => {
                    const destructive = btn.style === 'destructive';
                    const cancel = btn.style === 'cancel';
                    return (
                      <Pressable
                        key={`${btn.text}-${idx}`}
                        style={[
                          styles.btn,
                          cancel ? styles.btnGhost : destructive ? styles.btnDestructive : styles.btnPrimary,
                        ]}
                        onPress={() => runButton(btn)}
                      >
                        <Text
                          style={[
                            styles.btnText,
                            cancel ? styles.btnTextGhost : destructive ? styles.btnTextDestructive : styles.btnTextPrimary,
                          ]}
                        >
                          {btn.text ?? 'OK'}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={promptState != null} transparent animationType="fade" onRequestClose={closePrompt}>
        <Pressable style={styles.scrim} onPress={closePrompt}>
          <Pressable
            style={[styles.card, { paddingBottom: insets.bottom + DS.space.lg }]}
            onPress={(e) => e.stopPropagation()}
          >
            {promptState ? (
              <>
                <Text style={styles.title}>{promptState.title}</Text>
                {promptState.message ? <Text style={styles.message}>{promptState.message}</Text> : null}
                <TextInput
                  style={styles.input}
                  value={promptValue}
                  onChangeText={setPromptValue}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  secureTextEntry={promptState.inputType === 'secure-text'}
                  placeholder="DELETE"
                  placeholderTextColor={DS.color.textMuted}
                />
                <View style={styles.actions}>
                  {promptState.buttons.map((btn, idx) => {
                    const destructive = btn.style === 'destructive';
                    const cancel = btn.style === 'cancel';
                    return (
                      <Pressable
                        key={`${btn.text}-${idx}`}
                        style={[
                          styles.btn,
                          cancel ? styles.btnGhost : destructive ? styles.btnDestructive : styles.btnPrimary,
                        ]}
                        onPress={() => runButton(btn, promptValue)}
                      >
                        <Text
                          style={[
                            styles.btnText,
                            cancel ? styles.btnTextGhost : destructive ? styles.btnTextDestructive : styles.btnTextPrimary,
                          ]}
                        >
                          {btn.text ?? 'OK'}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: DS.color.overlayDark80,
    justifyContent: 'center',
    alignItems: 'center',
    padding: DS.space.lg,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'rgba(16,16,16,0.98)',
    borderRadius: DS.radius.xl,
    borderWidth: 1,
    borderColor: DS.color.goldTint30,
    padding: DS.space.lg,
  },
  title: {
    fontFamily: DS.font.bodyBold,
    fontSize: 18,
    color: DS.color.text,
    marginBottom: DS.space.sm,
  },
  message: {
    fontFamily: DS.font.body,
    fontSize: 15,
    lineHeight: 22,
    color: DS.color.textMuted,
    marginBottom: DS.space.lg,
  },
  input: {
    marginBottom: DS.space.lg,
    paddingVertical: 12,
    paddingHorizontal: DS.space.md,
    borderRadius: DS.apple.radiusField,
    borderWidth: 1,
    borderColor: DS.color.goldTint30,
    backgroundColor: DS.apple.fillSecondary,
    color: DS.color.text,
    fontFamily: DS.font.bodyMedium,
    fontSize: 16,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: DS.space.sm,
    justifyContent: 'flex-end',
  },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: DS.space.md,
    borderRadius: DS.apple.radiusButton,
    minWidth: 88,
    alignItems: 'center',
  },
  btnPrimary: {
    backgroundColor: DS.color.gold,
  },
  btnDestructive: {
    backgroundColor: '#8f1f1f',
  },
  btnGhost: {
    borderWidth: 1,
    borderColor: DS.color.borderWhite5,
    backgroundColor: 'transparent',
  },
  btnText: {
    fontFamily: DS.font.bodyBold,
    fontSize: 15,
  },
  btnTextPrimary: {
    color: DS.color.background,
  },
  btnTextDestructive: {
    color: DS.color.white,
  },
  btnTextGhost: {
    color: DS.color.textMuted,
  },
});
