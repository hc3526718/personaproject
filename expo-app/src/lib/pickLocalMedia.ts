import { ActionSheetIOS, Alert, Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { pickWebComposerFile, pickWebMediaFile } from './webFilePicker';
import { requestMediaSourceChoice } from './mediaSourcePickerBridge';

export type PickedLocalFile = {
  uri: string;
  name: string;
  kind: 'image' | 'video';
};

async function pickFromPhotoLibrary(
  kind: 'image' | 'video',
  multiple: boolean,
): Promise<PickedLocalFile[]> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('Permission needed', 'Allow camera roll access to choose photos and videos.');
    return [];
  }
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: kind === 'video' ? ['videos'] : ['images'],
    allowsMultipleSelection: multiple && kind === 'image',
    quality: 0.92,
    videoMaxDuration: kind === 'video' ? 300 : undefined,
    preferredAssetRepresentationMode:
      kind === 'video' ? ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible : undefined,
  });
  if (res.canceled) return [];
  return res.assets
    .filter((a) => a.uri)
    .map((a) => ({
      uri: a.uri,
      name: a.fileName ?? (kind === 'video' ? 'video.mp4' : 'image.jpg'),
      kind,
    }));
}

async function pickFromFiles(kind: 'image' | 'video', multiple: boolean): Promise<PickedLocalFile[]> {
  const res = await DocumentPicker.getDocumentAsync({
    multiple,
    copyToCacheDirectory: true,
    type: kind === 'video' ? 'video/*' : 'image/*',
  });
  if (res.canceled) return [];
  return res.assets
    .filter((a) => a.uri)
    .map((a) => ({
      uri: a.uri,
      name: a.name ?? (kind === 'video' ? 'video.mp4' : 'image.jpg'),
      kind,
    }));
}

/** Native device menu (ActionSheet on iOS, Alert on Android). */
function pickMediaSourceNative(title: string): Promise<'library' | 'files' | null> {
  if (Platform.OS === 'ios') {
    return new Promise((resolve) => {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title,
          options: ['Cancel', 'Camera roll', 'Browse files'],
          cancelButtonIndex: 0,
        },
        (index) => {
          if (index === 1) resolve('library');
          else if (index === 2) resolve('files');
          else resolve(null);
        },
      );
    });
  }
  return new Promise((resolve) => {
    Alert.alert(title, 'Choose a source', [
      { text: 'Photo library', onPress: () => resolve('library') },
      { text: 'Browse files', onPress: () => resolve('files') },
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
    ]);
  });
}

/**
 * Photo library or device files (master wizards, highlights, sponsor media).
 */
export function pickLocalMedia(
  kind: 'image' | 'video',
  options?: { multiple?: boolean; title?: string; nativeSourcePicker?: boolean },
): Promise<PickedLocalFile[]> {
  const multiple = options?.multiple ?? false;
  if (Platform.OS === 'web') {
    return pickWebMediaFile(kind).then((f) =>
      f ? [{ uri: f.uri, name: f.name || (kind === 'video' ? 'video.mp4' : 'image.jpg'), kind }] : [],
    );
  }
  const title = options?.title ?? (kind === 'video' ? 'Add video' : 'Add image');

  if (Platform.OS === 'ios' || options?.nativeSourcePicker) {
    return pickMediaSourceNative(title).then((key) => {
      if (key === 'library') return pickFromPhotoLibrary(kind, multiple);
      if (key === 'files') return pickFromFiles(kind, multiple);
      return [];
    });
  }

  const videoHint =
    kind === 'video'
      ? 'Large clips: use Browse files if Camera roll fails for iCloud-only videos.'
      : undefined;

  return requestMediaSourceChoice({
    title,
    hint: videoHint ?? 'Choose a source',
    options:
      kind === 'video'
        ? [
            { key: 'files', label: 'Browse files' },
            { key: 'library', label: 'Camera roll' },
          ]
        : [
            { key: 'library', label: 'Camera roll' },
            { key: 'files', label: 'Browse files' },
          ],
  }).then((key) => {
    if (key === 'library') return pickFromPhotoLibrary(kind, multiple);
    if (key === 'files') return pickFromFiles(kind, multiple);
    return [];
  });
}

export function pickLocalImage(options?: {
  multiple?: boolean;
  title?: string;
  nativeSourcePicker?: boolean;
}): Promise<PickedLocalFile[]> {
  return pickLocalMedia('image', options);
}

export function pickLocalVideo(options?: {
  title?: string;
  nativeSourcePicker?: boolean;
}): Promise<PickedLocalFile[]> {
  return pickLocalMedia('video', { ...options, multiple: false });
}

async function pickComposerFromPhotoLibrary(): Promise<PickedLocalFile[]> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('Permission needed', 'Allow camera roll access to choose photos and videos.');
    return [];
  }
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images', 'videos'],
    allowsMultipleSelection: true,
    quality: 0.92,
    videoMaxDuration: 300,
    preferredAssetRepresentationMode:
      ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
  });
  if (res.canceled) return [];
  return res.assets
    .filter((a) => a.uri)
    .map((a) => ({
      uri: a.uri,
      name: a.fileName ?? (a.type === 'video' ? 'video.mp4' : 'image.jpg'),
      kind: (a.type === 'video' ? 'video' : 'image') as 'image' | 'video',
    }));
}

async function pickComposerFromFiles(): Promise<PickedLocalFile[]> {
  const res = await DocumentPicker.getDocumentAsync({
    multiple: true,
    copyToCacheDirectory: true,
    type: ['image/*', 'video/*'],
  });
  if (res.canceled) return [];
  return res.assets
    .filter((a) => a.uri)
    .map((a) => {
      const name = a.name ?? 'file';
      const isVideo = /^video\//i.test(a.mimeType ?? '') || /\.(mp4|mov|m4v|webm)$/i.test(name);
      return {
        uri: a.uri,
        name,
        kind: isVideo ? ('video' as const) : ('image' as const),
      };
    });
}

/** Photos and videos for community post composer (library or device files). */
export function pickLocalComposerMedia(options?: {
  title?: string;
  /** Use native ActionSheet / Alert instead of the in-app source menu. */
  nativeSourcePicker?: boolean;
}): Promise<PickedLocalFile[]> {
  if (Platform.OS === 'web') {
    return pickWebComposerFile().then((f) => {
      if (!f) return [];
      const isVideo = /^video\//i.test(f.mimeType ?? '') || /\.(mp4|mov|webm)$/i.test(f.name ?? '');
      return [{ uri: f.uri, name: f.name || (isVideo ? 'video.mp4' : 'image.jpg'), kind: isVideo ? 'video' : 'image' }];
    });
  }

  const title = options?.title ?? 'Add media';

  if (Platform.OS === 'ios' || options?.nativeSourcePicker) {
    return pickMediaSourceNative(title).then((key) => {
      if (key === 'library') return pickComposerFromPhotoLibrary();
      if (key === 'files') return pickComposerFromFiles();
      return [];
    });
  }

  return requestMediaSourceChoice({
    title,
    options: [
      { key: 'library', label: 'Camera roll' },
      { key: 'files', label: 'Browse files' },
    ],
  }).then((key) => {
    if (key === 'library') return pickComposerFromPhotoLibrary();
    if (key === 'files') return pickComposerFromFiles();
    return [];
  });
}
