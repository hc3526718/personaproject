import { useCallback, useState, type ReactNode } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FontAwesome } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthContext';
import { AppButton } from '../components/ui/AppButton';
import { FormField } from '../components/ui/FormField';
import { ScreenHeader } from '../components/ScreenHeader';
import { canCreateVerifiedContent } from '../creator/creatorAccess';
import { DS } from '../designSystem';
import type { MediaStackParamList } from '../navigation/types';
import { useSubscription } from '../subscriptions/SubscriptionContext';

type Props = NativeStackScreenProps<MediaStackParamList, 'CreateMediaContent'>;

const DESC_MIN = 100;

export function CreateMediaContentScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { isPro } = useSubscription();
  const allowed = canCreateVerifiedContent(isPro, user);

  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tagPeople, setTagPeople] = useState('');
  const [searchTags, setSearchTags] = useState('');

  const pickVideo = useCallback(async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not on web', 'Use iOS or Android to pick a video file.');
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to attach a video.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: false,
      quality: 1,
    });
    if (!res.canceled && res.assets[0]?.uri) {
      setVideoUri(res.assets[0].uri);
    }
  }, []);

  const submit = useCallback(() => {
    const errs: string[] = [];
    if (!videoUri) errs.push('Video is required.');
    if (!title.trim()) errs.push('Title is required.');
    if (description.trim().length < DESC_MIN) {
      errs.push(`Description must be at least ${DESC_MIN} characters.`);
    }
    if (errs.length) {
      Alert.alert('Check form', errs.join('\n'));
      return;
    }
    Alert.alert(
      'Queued for review',
      'Your upload will go live after Dalton verification and Supabase Storage wiring (see WHAT_NEXT.md).',
      [{ text: 'OK', onPress: () => navigation.goBack() }],
    );
  }, [videoUri, title, description, navigation]);

  if (!allowed) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <ScreenHeader title="Upload video" onBack={() => navigation.goBack()} />
        <View style={styles.gateBody}>
          <FontAwesome name="lock" size={40} color={DS.color.textMuted} />
          <Text style={styles.gateTitle}>Creator access</Text>
          <Text style={styles.gateTxt}>
            Premium membership and Dalton verification are required to publish media. Upgrade or
            complete verification in your profile when the backend is connected.
          </Text>
          <AppButton label="Back" onPress={() => navigation.goBack()} variant="secondary" />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScreenHeader title="Upload video" onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lead}>
          Submissions are reviewed. Video is required; description helps moderation and search.
        </Text>

        <FormField label="Video file" required hint="MP4 / MOV from your library (native only).">
          <PressableField onPress={pickVideo}>
            {videoUri ? (
              <Text style={styles.fileOk} numberOfLines={2}>
                {videoUri}
              </Text>
            ) : (
              <View style={styles.pickRow}>
                <FontAwesome name="video-camera" size={20} color={DS.color.gold} />
                <Text style={styles.pickTxt}>Choose video</Text>
              </View>
            )}
          </PressableField>
        </FormField>

        <FormField label="Title" required>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Clear, descriptive title"
            placeholderTextColor={DS.color.textMuted}
            style={styles.input}
          />
        </FormField>

        <FormField
          label="Description"
          required
          hint={`Minimum ${DESC_MIN} characters (${description.trim().length}/${DESC_MIN})`}
          error={
            description.length > 0 && description.trim().length < DESC_MIN
              ? `Need ${DESC_MIN - description.trim().length} more characters`
              : undefined
          }
        >
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="What viewers will learn, context, safety notes…"
            placeholderTextColor={DS.color.textMuted}
            style={[styles.input, styles.inputMulti]}
            multiline
            textAlignVertical="top"
          />
        </FormField>

        <FormField
          label="Tag people"
          hint="Optional — comma-separated names or @handles (syncs with profiles when live)."
        >
          <TextInput
            value={tagPeople}
            onChangeText={setTagPeople}
            placeholder="Coach Williams, @marcus.j"
            placeholderTextColor={DS.color.textMuted}
            style={styles.input}
          />
        </FormField>

        <FormField
          label="Search tags"
          hint="Optional — comma-separated keywords for discovery."
        >
          <TextInput
            value={searchTags}
            onChangeText={setSearchTags}
            placeholder="sprint, technique, recovery"
            placeholderTextColor={DS.color.textMuted}
            style={styles.input}
          />
        </FormField>

        <AppButton label="Submit for review" onPress={submit} />
        <View style={{ height: DS.space.md }} />
        <AppButton label="Cancel" onPress={() => navigation.goBack()} variant="ghost" />
      </ScrollView>
    </View>
  );
}

function PressableField({ children, onPress }: { children: ReactNode; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.pickCard, pressed && styles.pickCardPressed]}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DS.color.background },
  body: { paddingHorizontal: DS.space.lg, paddingTop: DS.space.md },
  lead: {
    fontFamily: DS.font.body,
    fontSize: 14,
    color: DS.color.textMuted,
    lineHeight: 21,
    marginBottom: DS.apple.sectionGap,
  },
  input: {
    backgroundColor: DS.apple.fillSecondary,
    borderRadius: DS.apple.radiusField,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: DS.apple.separator,
    paddingHorizontal: DS.space.base,
    paddingVertical: 14,
    fontFamily: DS.font.body,
    fontSize: 16,
    color: DS.color.text,
  },
  inputMulti: { minHeight: 140, paddingTop: 14 },
  pickCard: {
    minHeight: DS.apple.controlHeight + 8,
    borderRadius: DS.apple.radiusField,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: DS.apple.separator,
    backgroundColor: DS.apple.fillTertiary,
    padding: DS.space.base,
    justifyContent: 'center',
  },
  pickCardPressed: { opacity: 0.85 },
  pickRow: { flexDirection: 'row', alignItems: 'center', gap: DS.space.md },
  pickTxt: { fontFamily: DS.font.bodyMedium, fontSize: 16, color: DS.color.text },
  fileOk: { fontFamily: DS.font.body, fontSize: 13, color: DS.color.gold },
  gateBody: {
    flex: 1,
    padding: DS.space.xl,
    justifyContent: 'center',
    gap: DS.space.lg,
  },
  gateTitle: {
    fontFamily: DS.font.heading,
    fontSize: 28,
    color: DS.color.text,
    letterSpacing: 1,
  },
  gateTxt: { fontFamily: DS.font.body, fontSize: 15, color: DS.color.textMuted, lineHeight: 22 },
});
