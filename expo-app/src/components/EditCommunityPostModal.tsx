import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaptionComposer, type CaptionComposerValue } from './CaptionComposer';
import { DS } from '../designSystem';
import {
  buildCaptionPlainText,
  buildCaptionForStorage,
  formatStoredCaptionForComposer,
} from '../lib/captionHashtags';
import { normalizePostBodyForStorage, validateMentionsInText } from '../lib/postMentions';
import { parsePostBody } from '../lib/communityPostBody';

type Props = {
  visible: boolean;
  postId: string;
  storedBody: string;
  busy: boolean;
  onClose: () => void;
  onSave: (plainText: string) => Promise<boolean>;
};

export function EditCommunityPostModal({
  visible,
  postId,
  storedBody,
  busy,
  onClose,
  onSave,
}: Props) {
  const insets = useSafeAreaInsets();
  const [captionValue, setCaptionValue] = useState<CaptionComposerValue>({ body: '', hashtags: [] });
  const [captionPlain, setCaptionPlain] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    const { displayBody } = parsePostBody(storedBody);
    const parsed = formatStoredCaptionForComposer(displayBody);
    setCaptionValue(parsed);
    setCaptionPlain(buildCaptionPlainText(parsed.body, parsed.hashtags));
    setError(null);
  }, [visible, storedBody, postId]);

  const handleChange = useCallback((value: CaptionComposerValue, plain: string) => {
    setCaptionValue(value);
    setCaptionPlain(plain);
    setError(null);
  }, []);

  const submit = useCallback(async () => {
    const plain = buildCaptionForStorage(captionValue.body);
    const mentionErr = await validateMentionsInText(plain);
    if (mentionErr) {
      setError(mentionErr);
      return;
    }
    const { eventId } = parsePostBody(storedBody);
    const eventTag = eventId ? `\n\n#event:${eventId}` : '';
    const bodyStored = `${normalizePostBodyForStorage(plain.trim())}${eventTag}`;
    const ok = await onSave(bodyStored);
    if (ok) onClose();
    else setError('Could not save changes. Try again.');
  }, [captionValue, storedBody, onSave, onClose]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={10}>
            <FontAwesome name="times" size={20} color={DS.color.gold} />
          </Pressable>
          <Text style={styles.title}>Edit post</Text>
          <Pressable onPress={() => void submit()} disabled={busy} style={busy ? { opacity: 0.5 } : undefined}>
            <Text style={styles.save}>{busy ? 'Saving…' : 'Save'}</Text>
          </Pressable>
        </View>
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <CaptionComposer value={captionValue} onChange={handleChange} maxLength={4000} />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {busy ? <ActivityIndicator color={DS.color.gold} style={{ marginTop: 16 }} /> : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: DS.color.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: DS.space.base,
    paddingVertical: DS.space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DS.color.borderWhite5,
  },
  title: {
    fontFamily: DS.font.heading,
    fontSize: 18,
    color: DS.color.text,
    letterSpacing: 0.5,
  },
  save: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 16,
    color: DS.color.gold,
  },
  body: {
    padding: DS.space.base,
    paddingBottom: 40,
  },
  error: {
    marginTop: DS.space.md,
    fontFamily: DS.font.bodyMedium,
    fontSize: 14,
    color: DS.color.error,
  },
});
