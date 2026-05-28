import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FontAwesome } from '@expo/vector-icons';
import { useAuth } from '../../auth/AuthContext';
import { DS } from '../../designSystem';
import { uploadProposalAttachment } from '../../lib/proposalAttachmentUpload';
import { masterInstantPublish } from '../../lib/masterInstantPublish';
import type { SponsorsStackParamList } from '../../navigation/types';
import { WizardChrome } from './WizardChrome';
import { useFocusEffect } from '@react-navigation/native';

type Props = NativeStackScreenProps<SponsorsStackParamList, 'SponsorProposalWizard'>;

const TOTAL_STEPS = 6;

type LinkRow = { label: string; url: string };
type PromoRow = { code: string; details: string };

export function SponsorProposalWizard({ navigation }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [brandName, setBrandName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [hook, setHook] = useState('');
  const [helpsAthletes, setHelpsAthletes] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [logo, setLogo] = useState<{ name: string; uri: string } | null>(null);
  const [coverImage, setCoverImage] = useState<{ name: string; uri: string } | null>(null);
  const [video, setVideo] = useState<{ name: string; uri: string } | null>(null);
  const [gallery, setGallery] = useState<{ name: string; uri: string }[]>([]);
  const [links, setLinks] = useState<LinkRow[]>([{ label: '', url: '' }]);
  const [promoCodes, setPromoCodes] = useState<PromoRow[]>([{ code: '', details: '' }]);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmTitle, setConfirmTitle] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!user?.masterControl) {
        navigation.goBack();
      }
    }, [navigation, user?.masterControl]),
  );

  const pickCover = useCallback(async () => {
    const res = await DocumentPicker.getDocumentAsync({
      multiple: false,
      copyToCacheDirectory: true,
      type: 'image/*',
    });
    if (res.canceled) return;
    const a = res.assets?.[0];
    if (!a?.uri) return;
    setCoverImage({ name: a.name ?? 'cover.jpg', uri: a.uri });
  }, []);

  const pickLogo = useCallback(async () => {
    const res = await DocumentPicker.getDocumentAsync({
      multiple: false,
      copyToCacheDirectory: true,
      type: 'image/*',
    });
    if (res.canceled) return;
    const a = res.assets?.[0];
    if (!a?.uri) return;
    setLogo({ name: a.name ?? 'logo.png', uri: a.uri });
  }, []);

  const pickGallery = useCallback(async () => {
    const res = await DocumentPicker.getDocumentAsync({
      multiple: true,
      copyToCacheDirectory: true,
      type: 'image/*',
    });
    if (res.canceled) return;
    setGallery((prev) => [
      ...prev,
      ...res.assets.map((a) => ({ name: a.name ?? 'image.jpg', uri: a.uri })),
    ]);
  }, []);

  const pickVideo = useCallback(async () => {
    const res = await DocumentPicker.getDocumentAsync({
      multiple: false,
      copyToCacheDirectory: true,
      type: 'video/*',
    });
    if (res.canceled) return;
    const a = res.assets?.[0];
    if (!a?.uri) return;
    setVideo({ name: a.name ?? 'video.mp4', uri: a.uri });
  }, []);

  const cleanedLinks = useMemo(
    () =>
      links
        .map((l) => ({ label: l.label.trim(), url: l.url.trim() }))
        .filter((l) => l.label && l.url && /^https?:\/\//i.test(l.url)),
    [links],
  );
  const cleanedPromos = useMemo(
    () =>
      promoCodes
        .map((p) => ({ code: p.code.trim(), details: p.details.trim() }))
        .filter((p) => p.code && p.details),
    [promoCodes],
  );

  const publish = useCallback(async () => {
    if (publishing || !user?.id) return;
    if (!coverImage?.uri) {
      setError('Cover image is required.');
      return;
    }
    setPublishing(true);
    setError(null);
    const uploaded: string[] = [];
    const coverUrl = await uploadProposalAttachment(user.id, 'sponsor', coverImage.uri, coverImage.name);
    if (coverUrl) uploaded.push(coverUrl);

    const logoUrl = logo
      ? await uploadProposalAttachment(user.id, 'sponsor', logo.uri, logo.name)
      : null;

    const galleryUrls: string[] = [];
    for (const img of gallery) {
      const url = await uploadProposalAttachment(user.id, 'sponsor', img.uri, img.name);
      if (url) galleryUrls.push(url);
    }
    const videoUrl = video
      ? await uploadProposalAttachment(user.id, 'sponsor', video.uri, video.name)
      : null;

    const result = await masterInstantPublish(
      user.id,
      'sponsor',
      {
        brand_name: brandName.trim(),
        contact_email: contactEmail.trim(),
        hook: hook.trim(),
        helps_athletes: helpsAthletes.trim(),
        website_url: websiteUrl.trim(),
        video_url: videoUrl,
        logo_url: logoUrl,
        gallery_urls: galleryUrls,
        external_links: cleanedLinks,
        promo_codes: cleanedPromos,
      },
      uploaded,
    );
    setPublishing(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setConfirmTitle(brandName.trim());
    setStep(5);
  }, [
    brandName,
    cleanedLinks,
    cleanedPromos,
    contactEmail,
    coverImage,
    gallery,
    helpsAthletes,
    hook,
    logo,
    publishing,
    user?.id,
    video,
    websiteUrl,
  ]);

  useEffect(() => {
    if (step !== 5 || !confirmTitle) return;
    const timer = setTimeout(() => {
      navigation.reset({
        index: 0,
        routes: [{ name: 'SponsorListings', params: { createdSponsorName: confirmTitle } }],
      });
    }, 2600);
    return () => clearTimeout(timer);
  }, [step, confirmTitle, navigation]);

  const chrome = (
    children: React.ReactNode,
    opts?: {
      nextLabel?: string;
      onNext?: () => void;
      hideNext?: boolean;
      nextDisabled?: boolean;
    },
  ) => (
    <WizardChrome
      title="Create sponsor"
      step={step}
      totalSteps={TOTAL_STEPS}
      onBack={() => (step > 1 ? setStep(step - 1) : navigation.goBack())}
      onNext={opts?.hideNext ? undefined : opts?.onNext ?? (() => setStep(step + 1))}
      nextLabel={opts?.nextLabel}
      nextDisabled={publishing || opts?.nextDisabled}
      errorMessage={error}
    >
      {children}
    </WizardChrome>
  );

  if (step === 1) {
    return chrome(
      <>
        <Text style={styles.lead}>Partner page details — published live when you confirm.</Text>
        <Text style={styles.label}>Brand / organisation</Text>
        <TextInput
          style={styles.input}
          value={brandName}
          onChangeText={setBrandName}
          placeholder="Company name"
          placeholderTextColor={DS.color.textMuted}
        />
        <Text style={styles.label}>Contact email</Text>
        <TextInput
          style={styles.input}
          value={contactEmail}
          onChangeText={setContactEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="partnerships@brand.com"
          placeholderTextColor={DS.color.textMuted}
        />
      </>,
      { nextDisabled: !brandName.trim() || !contactEmail.includes('@') },
    );
  }

  if (step === 2) {
    return chrome(
      <>
        <Text style={styles.lead}>What do you provide, and how does it help athletes?</Text>
        <Text style={styles.label}>Short hook (headline)</Text>
        <TextInput
          style={styles.input}
          value={hook}
          onChangeText={setHook}
          placeholder="e.g. 20% off training gear for verified members"
          placeholderTextColor={DS.color.textMuted}
        />
        <Text style={styles.label}>How this helps athletes</Text>
        <TextInput
          style={[styles.input, styles.multi]}
          value={helpsAthletes}
          onChangeText={setHelpsAthletes}
          multiline
          placeholder="Explain the offer, eligibility, and what athletes get (min 50 characters)"
          placeholderTextColor={DS.color.textMuted}
        />
      </>,
      { nextDisabled: !hook.trim() || helpsAthletes.trim().length < 50 },
    );
  }

  if (step === 3) {
    return chrome(
      <>
        <Text style={styles.lead}>Build the sponsor page media.</Text>
        <Text style={styles.label}>Logo (shown on sponsor listings)</Text>
        <Text style={styles.linkBtn} onPress={() => void pickLogo()}>
          {logo ? 'Change logo' : '+ Upload logo'}
        </Text>
        {logo ? <Text style={styles.fileRow}>{logo.name}</Text> : null}

        <Text style={styles.label}>Cover image *</Text>
        <Text style={styles.linkBtn} onPress={() => void pickCover()}>
          {coverImage ? 'Change cover image' : '+ Upload cover image'}
        </Text>
        {coverImage ? <Text style={styles.fileRow}>{coverImage.name}</Text> : null}

        <Text style={styles.label}>Optional promo video</Text>
        <Text style={styles.linkBtn} onPress={() => void pickVideo()}>
          {video ? 'Change video' : '+ Upload video'}
        </Text>
        {video ? <Text style={styles.fileRow}>{video.name}</Text> : null}

        <Text style={styles.label}>Extra images (optional)</Text>
        <Text style={styles.linkBtn} onPress={() => void pickGallery()}>
          + Add images
        </Text>
        {gallery.length ? <Text style={styles.fileRow}>{gallery.length} image(s) selected</Text> : null}
      </>,
      { nextDisabled: !coverImage },
    );
  }

  if (step === 4) {
    return chrome(
      <>
        <Text style={styles.lead}>Links & promo codes (shown on the sponsor page).</Text>
        <Text style={styles.label}>Website</Text>
        <TextInput
          style={styles.input}
          value={websiteUrl}
          onChangeText={setWebsiteUrl}
          placeholder="https://brand.com"
          placeholderTextColor={DS.color.textMuted}
          autoCapitalize="none"
        />

        <Text style={styles.label}>External links</Text>
        {links.map((l, i) => (
          <View key={i} style={styles.row2}>
            <TextInput
              style={[styles.input, { flex: 0.42, marginBottom: 0 }]}
              value={l.label}
              onChangeText={(t) => setLinks((prev) => prev.map((x, j) => (j === i ? { ...x, label: t } : x)))}
              placeholder="Label"
              placeholderTextColor={DS.color.textMuted}
            />
            <TextInput
              style={[styles.input, { flex: 0.58, marginBottom: 0 }]}
              value={l.url}
              onChangeText={(t) => setLinks((prev) => prev.map((x, j) => (j === i ? { ...x, url: t } : x)))}
              placeholder="https://…"
              placeholderTextColor={DS.color.textMuted}
              autoCapitalize="none"
            />
          </View>
        ))}
        <Text
          style={[styles.linkBtn, { marginTop: DS.space.sm }]}
          onPress={() => setLinks((prev) => [...prev, { label: '', url: '' }])}
        >
          + Add link
        </Text>

        <Text style={styles.label}>Promo codes</Text>
        {promoCodes.map((p, i) => (
          <View key={i} style={styles.row2}>
            <TextInput
              style={[styles.input, { flex: 0.32, marginBottom: 0 }]}
              value={p.code}
              onChangeText={(t) =>
                setPromoCodes((prev) => prev.map((x, j) => (j === i ? { ...x, code: t } : x)))
              }
              placeholder="CODE"
              placeholderTextColor={DS.color.textMuted}
              autoCapitalize="characters"
            />
            <TextInput
              style={[styles.input, { flex: 0.68, marginBottom: 0 }]}
              value={p.details}
              onChangeText={(t) =>
                setPromoCodes((prev) => prev.map((x, j) => (j === i ? { ...x, details: t } : x)))
              }
              placeholder="What does it unlock?"
              placeholderTextColor={DS.color.textMuted}
            />
          </View>
        ))}
        <Text
          style={[styles.linkBtn, { marginTop: DS.space.sm }]}
          onPress={() => setPromoCodes((prev) => [...prev, { code: '', details: '' }])}
        >
          + Add promo code
        </Text>
      </>,
      { nextLabel: 'Review' },
    );
  }

  if (step === 5) {
    return chrome(
      <>
        <Text style={styles.lead}>Review before publishing to the app.</Text>
        <Text style={styles.reviewTitle}>{brandName}</Text>
        <Text style={styles.reviewMeta}>{contactEmail}</Text>
        <Text style={styles.reviewBody}>{hook}</Text>
        <Text style={styles.reviewBody}>{helpsAthletes}</Text>
        {websiteUrl.trim() ? <Text style={styles.reviewMeta}>{websiteUrl.trim()}</Text> : null}
        {coverImage ? <Text style={styles.reviewMeta}>Cover: {coverImage.name}</Text> : null}
        {video ? <Text style={styles.reviewMeta}>Video: {video.name}</Text> : null}
        {gallery.length ? <Text style={styles.reviewMeta}>Gallery: {gallery.length} image(s)</Text> : null}
        {cleanedLinks.length ? <Text style={styles.reviewMeta}>Links: {cleanedLinks.length}</Text> : null}
        {cleanedPromos.length ? <Text style={styles.reviewMeta}>Promo codes: {cleanedPromos.length}</Text> : null}
      </>,
      {
        nextLabel: publishing ? 'Publishing…' : 'Create sponsor',
        onNext: () => void publish(),
      },
    );
  }

  return chrome(
    <>
      <View style={styles.confirmHero}>
        <FontAwesome name="check-circle" size={48} color={DS.color.gold} />
        <Text style={styles.confirmTitle}>Sponsor page live</Text>
        <Text style={styles.confirmSubtitle}>{confirmTitle}</Text>
      </View>
      <Text style={styles.confirmHint}>Taking you to Sponsors…</Text>
    </>,
    { hideNext: true },
  );
}

const styles = StyleSheet.create({
  lead: {
    fontFamily: DS.font.body,
    fontSize: 14,
    color: DS.color.textMuted,
    marginBottom: DS.space.lg,
    lineHeight: 20,
  },
  label: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 13,
    color: DS.color.screenTitle,
    marginBottom: DS.space.xs,
  },
  input: {
    backgroundColor: DS.color.input,
    borderRadius: DS.radius.lg,
    padding: DS.space.md,
    color: DS.color.text,
    fontFamily: DS.font.body,
    fontSize: 15,
    marginBottom: DS.space.md,
  },
  multi: { minHeight: 120, textAlignVertical: 'top' },
  row2: { flexDirection: 'row', gap: DS.space.sm, marginBottom: DS.space.md },
  linkBtn: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 15,
    color: DS.color.gold,
    marginBottom: DS.space.md,
  },
  fileRow: {
    fontFamily: DS.font.body,
    fontSize: 13,
    color: DS.color.textMuted,
    marginBottom: 4,
  },
  reviewTitle: {
    fontFamily: DS.font.heading,
    fontSize: 26,
    color: DS.color.white,
    marginBottom: DS.space.sm,
  },
  reviewMeta: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 14,
    color: DS.color.gold,
    marginBottom: DS.space.sm,
  },
  reviewBody: {
    fontFamily: DS.font.body,
    fontSize: 15,
    color: DS.color.text,
    lineHeight: 22,
  },
  confirmHero: { alignItems: 'center', marginTop: DS.space.lg, marginBottom: DS.space.lg },
  confirmTitle: {
    fontFamily: DS.font.heading,
    fontSize: 24,
    color: DS.color.text,
    marginTop: DS.space.md,
  },
  confirmSubtitle: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 16,
    color: DS.color.gold,
    marginTop: DS.space.sm,
    textAlign: 'center',
  },
  confirmHint: {
    fontFamily: DS.font.body,
    fontSize: 13,
    color: DS.color.textMuted,
    textAlign: 'center',
    marginTop: DS.space.xl,
  },
});
