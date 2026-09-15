import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { CommonActions } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FontAwesome, FontAwesome5 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthContext';
import { signTicketPayload } from '../booking/ticketToken';
import { downloadAndShareWalletPass } from '../booking/walletPass';
import { AppleHeroButton } from '../components/AppleHeroButton';
import { BookingQrCode } from '../components/BookingQrCode';
import { DS, tabRootHeaderPadding, tabRootTitleText } from '../designSystem';
import type { IcsEventInput } from '../integrations/eventCalendar';
import { shareEventAsIcs } from '../integrations/eventCalendar';
import {
  MY_BOOKINGS_PAST_FROM_HTML,
  MY_BOOKINGS_UPCOMING_FROM_HTML,
} from '../data/myBookingsFromHtml';
import { SAVED_EVENTS_FROM_HTML } from '../data/savedEventsFromHtml';
import { UPCOMING_EVENTS_FROM_HTML } from '../data/upcomingEventsFromHtml';
import type { EventsStackParamList } from '../navigation/types';

const eventCtaLabelStyle = {
  fontFamily: DS.font.bodyBold,
  fontSize: 15,
  color: DS.color.background,
  letterSpacing: 1,
  textTransform: 'uppercase' as const,
};

type EProps<K extends keyof EventsStackParamList> = NativeStackScreenProps<EventsStackParamList, K>;

const DEFAULT_HERO =
  'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=600&auto=format&fit=crop';

export function UpcomingEventsScreen({ navigation }: EProps<'UpcomingEvents'>) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const gridHPad = DS.space.lg;
  const gridGap = DS.space.base;
  const gridInner = windowWidth - gridHPad * 2;
  const cellW = Math.max(0, Math.floor((gridInner - gridGap) / 2));

  return (
    <View style={styles.root}>
      <View
        style={[
          styles.eventsHeader,
          tabRootHeaderPadding,
          { paddingTop: insets.top + DS.space.md },
        ]}
      >
        <Text style={styles.eventsTitle}>EVENTS</Text>
        <View style={styles.eventsHeaderActions}>
          <Pressable
            style={styles.eventsIconBtnSm}
            hitSlop={8}
            onPress={() => navigation.navigate('CreateEvent')}
          >
            <FontAwesome name="plus" size={15} color={DS.color.text} />
          </Pressable>
          <Pressable
            style={styles.bellCircle}
            onPress={() =>
              navigation.getParent()?.navigate('Community', { screen: 'Notifications' })
            }
          >
            <FontAwesome name="bell" size={18} color={DS.color.text} />
          </Pressable>
        </View>
      </View>
      <ScrollView
        style={styles.eventsScroll}
        contentContainerStyle={[styles.eventsBody, { paddingBottom: 100 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionKicker}>UPCOMING</Text>
        <View style={styles.eventGrid}>
          {UPCOMING_EVENTS_FROM_HTML.map((c) => (
            <Pressable
              key={`${c.title}-${c.date}`}
              style={[
                styles.eventCell,
                cellW > 0 && { width: cellW, height: cellW },
              ]}
              onPress={() =>
                navigation.navigate('EventDetails', {
                  title: c.title,
                  imageUri: c.uri,
                  dateShort: c.date,
                  sub: c.sub,
                })
              }
            >
              <Image source={{ uri: c.uri }} style={styles.eventImg} resizeMode="cover" />
              <View style={styles.eventGrad} />
              <View style={styles.eventCopy}>
                <Text style={styles.eventDate}>{c.date}</Text>
                <Text style={styles.eventName}>{c.title}</Text>
                <Text style={styles.eventSub} numberOfLines={1}>
                  {c.sub}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
        <View style={styles.eventsFlowLinks}>
          <Pressable onPress={() => navigation.navigate('SavedEvents')}>
            <Text style={styles.eventsFlowLink}>Saved events →</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('MyBookings')}>
            <Text style={styles.eventsFlowLink}>My bookings →</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const AGENDA = [
  { n: '1', title: 'Warm-up & Movement Assessment', time: '10:00 - 10:15 AM' },
  { n: '2', title: 'Compound Movement Masterclass', time: '10:15 - 11:15 AM' },
  { n: '3', title: 'Power & Conditioning Circuit', time: '11:15 - 11:50 AM' },
  { n: '4', title: 'Cool Down & Q&A', time: '11:50 - 12:00 PM' },
] as const;

const BRING = ['Water bottle', 'Gym shoes', 'Workout clothes', 'Towel'] as const;

const FAQS = [
  {
    q: 'Is this suitable for beginners?',
    a: 'This session is designed for intermediate level. We recommend completing our Foundation course first.',
  },
  {
    q: 'What if I need to cancel?',
    a: 'Free cancellation up to 24 hours before the event. After that, 50% refund applies.',
  },
  {
    q: 'Will there be video recording?',
    a: 'Yes, all attendees receive access to session recordings for 30 days after the event.',
  },
] as const;

function splitScheduleLine(line: string): { datePart: string; timePart: string } {
  const sep = ' • ';
  const i = line.indexOf(sep);
  if (i === -1) return { datePart: line, timePart: '' };
  return { datePart: line.slice(0, i), timePart: line.slice(i + sep.length) };
}

function icsInputFromSchedule(
  title: string,
  venue: string,
  scheduleLine: string,
  refHint: string,
): IcsEventInput {
  const { datePart, timePart } = splitScheduleLine(scheduleLine);
  const recapTime = timePart || '10:00 AM - 12:00 PM';
  const timeStart = recapTime.split('-')[0]?.trim() ?? '10:00 AM';
  const timeEnd = recapTime.split('-')[1]?.trim() ?? timeStart;
  const start = new Date(`${datePart} ${timeStart}`);
  const end = new Date(`${datePart} ${timeEnd}`);
  if (Number.isNaN(start.getTime())) {
    const s = new Date();
    return {
      uid: refHint,
      title,
      location: venue,
      start: s,
      end: new Date(s.getTime() + 2 * 3600000),
      description: refHint,
    };
  }
  return {
    uid: refHint.replace(/\s+/g, '-'),
    title,
    location: venue,
    start,
    end: Number.isNaN(end.getTime()) ? new Date(start.getTime() + 2 * 3600000) : end,
    description: refHint,
  };
}

async function shareEventCalendar(
  title: string,
  venue: string,
  scheduleLine: string,
  refHint: string,
) {
  try {
    await shareEventAsIcs(icsInputFromSchedule(title, venue, scheduleLine, refHint));
  } catch (e) {
    Alert.alert('Calendar', e instanceof Error ? e.message : 'Could not create calendar file');
  }
}

export function EventDetailsScreen({ navigation, route }: EProps<'EventDetails'>) {
  const insets = useSafeAreaInsets();
  const [saved, setSaved] = useState(false);
  const title = route.params?.title ?? 'STRENGTH CAMP';
  const heroUri = route.params?.imageUri ?? DEFAULT_HERO;
  const dateShort = route.params?.dateShort;
  const heroScheduleLine =
    dateShort ?? 'October 15, 2024 • 10:00 AM - 12:00 PM';

  const goConfirm = () =>
    navigation.navigate('ConfirmAttend', {
      title,
      imageUri: heroUri,
      scheduleLine: heroScheduleLine,
    });

  const venueName = 'Elite Fitness Center';
  const addCal = () => void shareEventCalendar(title, venueName, heroScheduleLine, title);

  return (
    <View style={styles.root}>
      <View style={[styles.detailNavHeader, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.headerRoundBtn} onPress={() => navigation.goBack()}>
          <FontAwesome name="arrow-left" size={18} color={DS.color.text} />
        </Pressable>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Pressable
            style={styles.headerRoundBtn}
            onPress={() =>
              Share.share({
                message: `${title} — Dalton Grant Sports`,
              }).catch(() => undefined)
            }
          >
            <FontAwesome name="share-alt" size={16} color={DS.color.text} />
          </Pressable>
          <Pressable style={styles.headerRoundBtn} onPress={() => setSaved((s) => !s)}>
            <FontAwesome
              name={saved ? 'bookmark' : 'bookmark-o'}
              size={16}
              color={saved ? DS.color.gold : DS.color.text}
            />
          </Pressable>
        </View>
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 220 + insets.bottom }}
      >
        <View style={styles.detailHeroTall}>
          <Image source={{ uri: heroUri }} style={styles.detailHeroFill} resizeMode="cover" />
          <View style={styles.detailHeroScrimTop} />
          <View style={styles.detailHeroScrimBottom} />
          <View style={styles.detailHeroTextWrap}>
            <Text style={styles.detailHeroDate}>{heroScheduleLine}</Text>
            <Text style={[styles.detailHeroTitle, styles.detailHeroTitleGold]}>
              {title.toUpperCase()}
            </Text>
            <View style={styles.detailHeroMetaRowSpread}>
              <View style={styles.detailHeroMetaGroup}>
                <FontAwesome name="map-marker" size={12} color={DS.color.gold} />
                <Text style={styles.detailHeroMeta}>Elite Fitness Center</Text>
              </View>
              <View style={styles.detailHeroMetaGroup}>
                <FontAwesome name="users" size={12} color={DS.color.gold} />
                <Text style={styles.detailHeroMeta}>8/20 spots</Text>
              </View>
            </View>
          </View>
        </View>
        <View style={styles.detailPad}>
          <View style={styles.coachCard}>
            <Image
              source={{
                uri: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-2.jpg',
              }}
              style={styles.coachAvatar}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.coachName}>David Miller</Text>
              <View style={styles.coachVerifiedRow}>
                <FontAwesome name="check-circle" size={10} color={DS.color.gold} />
                <Text style={styles.coachVerified}> Venue Master</Text>
              </View>
              <Text style={styles.coachBio}>
                Elite strength & conditioning specialist with 10+ years experience
              </Text>
            </View>
          </View>
          <View style={styles.quickStatsRow}>
            <View style={styles.quickStat}>
              <FontAwesome name="clock-o" size={20} color={DS.color.gold} />
              <Text style={styles.quickStatLabel}>Duration</Text>
              <Text style={styles.quickStatVal}>2 Hours</Text>
            </View>
            <View style={styles.quickStat}>
              <FontAwesome name="signal" size={20} color={DS.color.gold} />
              <Text style={styles.quickStatLabel}>Level</Text>
              <Text style={styles.quickStatVal}>Intermediate</Text>
            </View>
          </View>
          <Text style={styles.detailSectionKicker}>OVERVIEW</Text>
          <Text style={styles.detailBody}>
            Elite performance training session designed to build functional strength and power. This
            intensive workshop combines compound movements, progressive overload techniques, and
            sport-specific conditioning.
          </Text>
          <Text style={styles.detailBody}>
            Perfect for athletes looking to break through plateaus and take their strength training to
            the next level. All equipment provided.
          </Text>
          <Text style={styles.detailSectionKicker}>AGENDA</Text>
          {AGENDA.map((a) => (
            <View key={a.n} style={styles.agendaRow}>
              <View style={styles.agendaNum}>
                <Text style={styles.agendaNumText}>{a.n}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.agendaTitle}>{a.title}</Text>
                <Text style={styles.agendaTime}>{a.time}</Text>
              </View>
            </View>
          ))}
          <Text style={styles.detailSectionKicker}>WHAT TO BRING</Text>
          <View style={styles.bringGrid}>
            {BRING.map((b) => (
              <View key={b} style={styles.bringGridCell}>
                <FontAwesome name="check" size={14} color={DS.color.gold} />
                <Text style={styles.bringText}>{b}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.detailSectionKicker}>FREQUENTLY ASKED</Text>
          {FAQS.map((f, idx) => (
            <View
              key={f.q}
              style={[styles.faqBlock, idx < FAQS.length - 1 && styles.faqBlockBorder]}
            >
              <Text style={styles.faqQ}>{f.q}</Text>
              <Text style={styles.faqA}>{f.a}</Text>
            </View>
          ))}
          <Pressable style={styles.calInlineBtn} onPress={addCal}>
            <FontAwesome name="calendar-plus-o" size={18} color={DS.color.gold} />
            <Text style={styles.calInlineBtnText}>Add to Calendar</Text>
          </Pressable>
        </View>
      </ScrollView>
      <View style={[styles.eventStickyFooter, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Pressable style={styles.calOutlineBtn} onPress={addCal}>
          <FontAwesome name="calendar-plus-o" size={16} color={DS.color.gold} />
          <Text style={styles.calOutlineText}> Add to Calendar</Text>
        </Pressable>
        <AppleHeroButton onPress={goConfirm} style={{ marginBottom: DS.space.sm }}>
          <Text style={eventCtaLabelStyle}>Attend now</Text>
        </AppleHeroButton>
        <Pressable style={styles.saveLaterOutlineBtn} onPress={() => navigation.navigate('SavedEvents')}>
          <Text style={styles.saveLaterOutlineText}>SAVE FOR LATER</Text>
        </Pressable>
      </View>
    </View>
  );
}

const FITNESS_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Expert/Athlete'] as const;

export function ConfirmAttendScreen({ navigation, route }: EProps<'ConfirmAttend'>) {
  const insets = useSafeAreaInsets();
  const { sessionEmail } = useAuth();
  const title = route.params?.title ?? 'STRENGTH CAMP';
  const heroUri = route.params?.imageUri ?? DEFAULT_HERO;
  const scheduleLine = route.params?.scheduleLine ?? 'October 15, 2024 • 10:00 AM - 12:00 PM';
  const { datePart, timePart } = splitScheduleLine(scheduleLine);

  const [fullName, setFullName] = useState('Alex Johnson');
  const [email, setEmail] = useState(sessionEmail ?? 'alex.johnson@email.com');
  const [phone, setPhone] = useState('+1 (555) 123-4567');
  const [level, setLevel] = useState<(typeof FITNESS_LEVELS)[number]>('Intermediate');
  const [notes, setNotes] = useState('');
  const [consent, setConsent] = useState(false);

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.rowHeader, { paddingTop: insets.top + DS.space.md }]}>
        <Pressable onPress={() => navigation.goBack()}>
          <FontAwesome name="arrow-left" size={22} color={DS.color.text} />
        </Pressable>
        <Text style={styles.rowTitle}>CONFIRM ATTENDANCE</Text>
        <View style={{ width: 22 }} />
      </View>
      <ScrollView
        contentContainerStyle={[styles.padded, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.detailSectionKicker}>EVENT SUMMARY</Text>
        <View style={styles.confirmEventCard}>
          <View style={styles.confirmEventCardInner}>
            <Image source={{ uri: heroUri }} style={styles.confirmThumbLg} />
            <View style={{ flex: 1 }}>
              <Text style={styles.confirmEventTitle}>{title.toUpperCase()}</Text>
              <View style={styles.confirmMetaRow}>
                <FontAwesome name="calendar" size={10} color={DS.color.gold} />
                <Text style={styles.confirmMetaText}>{datePart}</Text>
              </View>
              {timePart ? (
                <View style={styles.confirmMetaRow}>
                  <FontAwesome name="clock-o" size={10} color={DS.color.gold} />
                  <Text style={styles.confirmMetaText}>{timePart}</Text>
                </View>
              ) : null}
              <View style={styles.confirmMetaRow}>
                <FontAwesome name="map-marker" size={10} color={DS.color.gold} />
                <Text style={styles.confirmMetaText}>Elite Fitness Center</Text>
              </View>
            </View>
          </View>
        </View>

        <Text style={styles.detailSectionKicker}>YOUR DETAILS</Text>
        <Text style={styles.confirmFieldLabel}>Full Name</Text>
        <TextInput
          style={styles.textIn}
          value={fullName}
          onChangeText={setFullName}
          placeholderTextColor={DS.color.textMuted}
        />
        <Text style={styles.confirmFieldLabel}>Email Address</Text>
        <TextInput
          style={styles.textIn}
          value={email}
          onChangeText={setEmail}
          placeholderTextColor={DS.color.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Text style={styles.confirmFieldLabel}>Phone Number</Text>
        <TextInput
          style={styles.textIn}
          value={phone}
          onChangeText={setPhone}
          placeholderTextColor={DS.color.textMuted}
          keyboardType="phone-pad"
        />

        <Text style={styles.detailSectionKicker}>FITNESS LEVEL</Text>
        <View style={styles.levelList}>
          {FITNESS_LEVELS.map((l) => (
            <Pressable
              key={l}
              style={[styles.levelPill, level === l && styles.levelPillOn]}
              onPress={() => setLevel(l)}
            >
              <Text style={[styles.levelPillTxt, level === l && styles.levelPillTxtOn]}>{l}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.detailSectionKicker}>
          ADDITIONAL NOTES <Text style={styles.optionalMuted}>(OPTIONAL)</Text>
        </Text>
        <TextInput
          style={[styles.textIn, styles.textArea]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Any injuries, dietary restrictions, or special requirements..."
          placeholderTextColor={DS.color.textMuted}
          multiline
        />

        <View style={styles.consentCard}>
          <Pressable style={styles.consentRow} onPress={() => setConsent((c) => !c)}>
            <View style={[styles.checkboxMd, consent && styles.checkboxSmOn]}>
              {consent ? <FontAwesome name="check" size={10} color={DS.color.background} /> : null}
            </View>
            <Text style={styles.consentText}>
              I acknowledge that I have read and agree to the{' '}
              <Text style={styles.consentLink}>terms and conditions</Text>,{' '}
              <Text style={styles.consentLink}>waiver of liability</Text>, and understand the risks
              involved in this fitness activity.
            </Text>
          </Pressable>
        </View>

        <View style={styles.policyBoxStrong}>
          <FontAwesome name="info-circle" size={14} color={DS.color.gold} style={{ marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.policyTitle}>Cancellation Policy</Text>
            <Text style={styles.policyTextStrong}>
              Free cancellation up to 24 hours before the event. Cancellations within 24 hours are
              subject to a 50% cancellation fee.{' '}
              <Text style={styles.consentLink}>View full policy</Text>
            </Text>
          </View>
        </View>

        <AppleHeroButton
          disabled={!consent}
          onPress={() =>
            navigation.navigate('BookingConfirm', {
              reference: 'SC-2024-1015',
              title,
              imageUri: heroUri,
              recapDate: datePart,
              recapTime: timePart || '10:00 AM - 12:00 PM',
              venue: 'Elite Fitness Center',
              attendeeName: fullName,
              attendeeEmail: email,
              fitnessLevel: level,
            })
          }
        >
          <Text style={eventCtaLabelStyle}>Confirm booking</Text>
        </AppleHeroButton>
        <Pressable style={styles.cancelOutlineBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelOutlineBtnText}>CANCEL</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function resetEventsToUpcoming(navigation: EProps<'BookingConfirm'>['navigation']) {
  navigation.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [{ name: 'UpcomingEvents' }],
    }),
  );
}

export function BookingConfirmScreen({ navigation, route }: EProps<'BookingConfirm'>) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const p = route.params;
  const refCode = p?.reference ?? 'SC-2024-1015';
  const evTitle = p?.title ?? 'STRENGTH CAMP';
  const evImg = p?.imageUri ?? DEFAULT_HERO;
  const recapDate = p?.recapDate ?? 'October 15, 2024';
  const recapTime = p?.recapTime ?? '10:00 AM - 12:00 PM';
  const venue = p?.venue ?? 'Elite Fitness Center';
  const attendeeName = p?.attendeeName ?? 'Alex Johnson';
  const attendeeEmail = p?.attendeeEmail ?? 'alex.johnson@email.com';
  const fitnessLevel = p?.fitnessLevel ?? 'Intermediate';
  const scheduleForIcs = `${recapDate} • ${recapTime}`;

  const [qrToken, setQrToken] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      if (p?.bookingId) {
        const { issueTicketTokenFromServer } = await import('../booking/hostCheckIn');
        const serverTok = await issueTicketTokenFromServer(p.bookingId);
        if (alive && serverTok) {
          setQrToken(serverTok);
          return;
        }
      }
      const payload = {
        v: 1 as const,
        ref: refCode,
        uid: user?.id ?? attendeeEmail,
        ...(p?.eventId ? { eventId: p.eventId } : {}),
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
      };
      const t = await signTicketPayload(payload);
      if (alive) setQrToken(t);
    })();
    return () => {
      alive = false;
    };
  }, [refCode, user?.id, attendeeEmail, p?.bookingId, p?.eventId]);

  const addCal = () => void shareEventCalendar(evTitle, venue, scheduleForIcs, refCode);

  const walletStep =
    Platform.OS === 'ios'
      ? [
          {
            key: 'wallet',
            title: 'Add to Apple Wallet',
            subtitle: 'Server-signed .pkpass in production',
            icon: <FontAwesome name="apple" size={14} color={DS.color.gold} />,
            onPress: () => {
              void (async () => {
                const result = await downloadAndShareWalletPass({
                  reference: refCode,
                  bookingId: p?.bookingId,
                });
                if (!result.ok) {
                  Alert.alert('Apple Wallet', result.reason);
                }
              })();
            },
          },
        ]
      : [];

  const steps = [
    ...walletStep,
    {
      key: 'cal',
      title: 'Add to Calendar',
      subtitle: 'Never miss this event',
      icon: <FontAwesome name="calendar-plus-o" size={14} color={DS.color.gold} />,
      onPress: addCal,
    },
    {
      key: 'dir',
      title: 'Get Directions',
      subtitle: 'Navigate to venue',
      icon: <FontAwesome5 name="location-arrow" size={14} color={DS.color.gold} />,
      onPress: () => {
        const q = encodeURIComponent(venue);
        void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`);
      },
    },
    {
      key: 'book',
      title: 'View My Bookings',
      subtitle: 'See all your events',
      icon: <FontAwesome name="ticket" size={14} color={DS.color.gold} />,
      onPress: () => navigation.navigate('MyBookings'),
    },
    {
      key: 'inv',
      title: 'Invite a Friend',
      subtitle: 'Share this event',
      icon: <FontAwesome name="user-plus" size={14} color={DS.color.gold} />,
      onPress: () =>
        Share.share({
          message: `Join me for ${evTitle} on Dalton Grant Sports (demo).`,
        }).catch(() => undefined),
    },
  ];

  return (
    <View style={styles.root}>
      <View style={[styles.bookingConfirmHeader, { paddingTop: insets.top + DS.space.md }]}>
        <Pressable style={styles.headerRoundBtn} onPress={() => resetEventsToUpcoming(navigation)}>
          <FontAwesome name="times" size={22} color={DS.color.textMuted} />
        </Pressable>
        <Text style={styles.rowTitle}>BOOKING CONFIRMED</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.bookingConfirmBody, { paddingBottom: insets.bottom + 32 }]}
      >
        <View style={styles.successHero}>
          <View style={styles.successCircleLg}>
            <FontAwesome name="check" size={32} color={DS.color.background} />
          </View>
          <Text style={styles.successHeadLg}>YOU&apos;RE ALL SET!</Text>
          <Text style={styles.bodyCenterTight}>Your spot has been reserved</Text>
        </View>

        <View style={styles.refGradientCard}>
          <Text style={styles.refLabel}>BOOKING REFERENCE</Text>
          <Text style={styles.refCodeLg}>{refCode}</Text>
          <View style={styles.qrWhiteWrap}>
            {qrToken ? (
              <BookingQrCode value={qrToken} />
            ) : (
              <View style={styles.qrInner}>
                <ActivityIndicator color={DS.color.gold} size="large" />
              </View>
            )}
          </View>
          <Text style={styles.qrHint}>Show this QR code at check-in</Text>
        </View>

        <Text style={styles.detailSectionKicker}>EVENT DETAILS</Text>
        <View style={styles.confirmEventCard}>
          <View style={styles.confirmEventCardInner}>
            <Image source={{ uri: evImg }} style={styles.confirmThumbLg} />
            <View style={{ flex: 1 }}>
              <Text style={styles.confirmEventTitle}>{evTitle.toUpperCase()}</Text>
              <View style={styles.confirmMetaRow}>
                <FontAwesome name="calendar" size={10} color={DS.color.gold} />
                <Text style={styles.confirmMetaText}>{recapDate}</Text>
              </View>
              <View style={styles.confirmMetaRow}>
                <FontAwesome name="clock-o" size={10} color={DS.color.gold} />
                <Text style={styles.confirmMetaText}>{recapTime}</Text>
              </View>
              <View style={styles.confirmMetaRow}>
                <FontAwesome name="map-marker" size={10} color={DS.color.gold} />
                <Text style={styles.confirmMetaText}>{venue}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.attendeeCard}>
          <View style={styles.attendeeRow}>
            <Text style={styles.attendeeLabel}>Attendee</Text>
            <Text style={styles.attendeeVal}>{attendeeName}</Text>
          </View>
          <View style={styles.attendeeRow}>
            <Text style={styles.attendeeLabel}>Email</Text>
            <Text style={[styles.attendeeVal, styles.attendeeValEmail]}>{attendeeEmail}</Text>
          </View>
          <View style={styles.attendeeRow}>
            <Text style={styles.attendeeLabel}>Fitness Level</Text>
            <Text style={styles.attendeeVal}>{fitnessLevel}</Text>
          </View>
        </View>

        <View style={styles.emailSentCard}>
          <FontAwesome name="envelope" size={18} color={DS.color.gold} style={{ marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.emailSentTitle}>Confirmation Email Sent</Text>
            <Text style={styles.emailSentBody}>
              We&apos;ve sent a confirmation email with all event details and your QR code to{' '}
              <Text style={styles.consentLink}>{attendeeEmail}</Text>
            </Text>
          </View>
        </View>

        <Text style={styles.detailSectionKicker}>NEXT STEPS</Text>
        {steps.map((s) => (
          <Pressable key={s.key} style={styles.nextStepRich} onPress={s.onPress}>
            <View style={styles.nextStepIconCircle}>{s.icon}</View>
            <View style={{ flex: 1 }}>
              <Text style={styles.nextStepTitle}>{s.title}</Text>
              <Text style={styles.nextStepSub}>{s.subtitle}</Text>
            </View>
            <FontAwesome name="chevron-right" size={12} color="rgba(212,208,200,0.35)" />
          </Pressable>
        ))}

        <AppleHeroButton style={{ marginTop: DS.space.lg }} onPress={() => resetEventsToUpcoming(navigation)}>
          <Text style={eventCtaLabelStyle}>Done</Text>
        </AppleHeroButton>
      </ScrollView>
    </View>
  );
}

export function SavedEventsScreen({ navigation }: EProps<'SavedEvents'>) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [saved, setSaved] = useState(SAVED_EVENTS_FROM_HTML);
  const [savedSearch, setSavedSearch] = useState('');
  const filteredSaved = useMemo(() => {
    const q = savedSearch.trim().toLowerCase();
    if (!q) return saved;
    return saved.filter(
      (row) =>
        row.title.toLowerCase().includes(q) ||
        row.place.toLowerCase().includes(q) ||
        row.dateLine.toLowerCase().includes(q),
    );
  }, [saved, savedSearch]);

  return (
    <View style={styles.root}>
      <View style={[styles.rowHeader, { paddingTop: insets.top + DS.space.md }]}>
        <Pressable style={styles.headerIconBtn} onPress={() => navigation.goBack()}>
          <FontAwesome name="arrow-left" size={18} color={DS.color.text} />
        </Pressable>
        <Text style={styles.rowTitle}>SAVED EVENTS</Text>
        <View style={styles.headerIconBtn} />
      </View>
      <ScrollView
        contentContainerStyle={[styles.savedScrollPad, { paddingBottom: 100 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.segmentWrap}>
          <Pressable
            style={[styles.segmentBtn, tab === 'upcoming' && styles.segmentBtnOn]}
            onPress={() => setTab('upcoming')}
          >
            <Text style={[styles.segmentTxt, tab === 'upcoming' && styles.segmentTxtOn]}>Upcoming</Text>
          </Pressable>
          <Pressable
            style={[styles.segmentBtn, tab === 'past' && styles.segmentBtnOn]}
            onPress={() => setTab('past')}
          >
            <Text style={[styles.segmentTxt, tab === 'past' && styles.segmentTxtOn]}>Past</Text>
          </Pressable>
        </View>

        <View style={styles.savedSearchField}>
          <FontAwesome name="search" size={14} color="rgba(212,208,200,0.4)" style={styles.savedSearchIcon} />
          <TextInput
            style={styles.savedSearchInput}
            placeholder="Search saved events..."
            placeholderTextColor="rgba(212,208,200,0.4)"
            value={savedSearch}
            onChangeText={setSavedSearch}
          />
        </View>

        {tab === 'upcoming' ? (
          <View style={styles.savedListGap}>
            {filteredSaved.map((row) => (
              <View key={row.id} style={styles.savedListCard}>
                <View style={styles.savedListRow}>
                  <Image source={{ uri: row.uri }} style={styles.savedListThumb} />
                  <View style={{ flex: 1 }}>
                    <View style={styles.savedListTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.savedListDateGold}>{row.dateLine}</Text>
                        <Text style={styles.savedListTitle}>{row.title}</Text>
                      </View>
                      <Pressable style={styles.savedBookmarkMini}>
                        <FontAwesome name="bookmark" size={14} color={DS.color.gold} />
                      </Pressable>
                    </View>
                    <View style={styles.savedListMeta}>
                      <View style={styles.savedMetaItem}>
                        <FontAwesome name="clock-o" size={9} color={DS.color.textMuted} />
                        <Text style={styles.savedMetaTxt}>{row.time}</Text>
                      </View>
                      <View style={styles.savedMetaItem}>
                        <FontAwesome name="map-marker" size={9} color={DS.color.textMuted} />
                        <Text style={styles.savedMetaTxt}>{row.place}</Text>
                      </View>
                    </View>
                    <View style={styles.savedListActions}>
                      <Pressable
                        style={styles.savedAttendSm}
                        onPress={() =>
                          navigation.navigate('ConfirmAttend', {
                            title: row.title,
                            imageUri: row.uri,
                            scheduleLine: row.scheduleLine,
                          })
                        }
                      >
                        <Text style={styles.savedAttendSmTxt}>Attend</Text>
                      </Pressable>
                      <Pressable
                        style={styles.savedUnsaveBtn}
                        onPress={() => setSaved((prev) => prev.filter((x) => x.id !== row.id))}
                      >
                        <Text style={styles.savedUnsaveTxt}>Unsave</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyStateWrap}>
            <View style={styles.emptyStateCircle}>
              <FontAwesome name="bookmark" size={28} color="rgba(212,208,200,0.25)" />
            </View>
            <Text style={styles.emptyStateTitle}>NO SAVED EVENTS</Text>
            <Text style={styles.emptyStateBody}>
              Start exploring events and save the ones you&apos;re interested in attending later.
            </Text>
            <Pressable style={styles.emptyStateCta} onPress={() => navigation.navigate('UpcomingEvents')}>
              <Text style={styles.emptyStateCtaTxt}>Explore Events</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

export function MyBookingsScreen({ navigation }: EProps<'MyBookings'>) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [upcoming, setUpcoming] = useState(MY_BOOKINGS_UPCOMING_FROM_HTML);
  const [bookingSearch, setBookingSearch] = useState('');
  const filteredUpcoming = useMemo(() => {
    const q = bookingSearch.trim().toLowerCase();
    if (!q) return upcoming;
    return upcoming.filter(
      (row) =>
        row.title.toLowerCase().includes(q) ||
        row.place.toLowerCase().includes(q) ||
        row.dateLine.toLowerCase().includes(q),
    );
  }, [upcoming, bookingSearch]);

  return (
    <View style={styles.root}>
      <View style={[styles.rowHeader, { paddingTop: insets.top + DS.space.md }]}>
        <Pressable style={styles.headerIconBtn} onPress={() => navigation.goBack()}>
          <FontAwesome name="arrow-left" size={18} color={DS.color.text} />
        </Pressable>
        <Text style={styles.rowTitle}>MY BOOKINGS</Text>
        <View style={styles.headerIconBtn} />
      </View>
      <ScrollView
        contentContainerStyle={[styles.savedScrollPad, { paddingBottom: 100 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.segmentWrap}>
          <Pressable
            style={[styles.segmentBtn, tab === 'upcoming' && styles.segmentBtnOn]}
            onPress={() => setTab('upcoming')}
          >
            <Text style={[styles.segmentTxt, tab === 'upcoming' && styles.segmentTxtOn]}>Upcoming</Text>
          </Pressable>
          <Pressable
            style={[styles.segmentBtn, tab === 'past' && styles.segmentBtnOn]}
            onPress={() => setTab('past')}
          >
            <Text style={[styles.segmentTxt, tab === 'past' && styles.segmentTxtOn]}>Past</Text>
          </Pressable>
        </View>

        <View style={styles.savedSearchField}>
          <FontAwesome name="search" size={14} color="rgba(212,208,200,0.4)" style={styles.savedSearchIcon} />
          <TextInput
            style={styles.savedSearchInput}
            placeholder="Search bookings..."
            placeholderTextColor="rgba(212,208,200,0.4)"
            value={bookingSearch}
            onChangeText={setBookingSearch}
          />
        </View>

        {tab === 'upcoming' ? (
          <View style={styles.savedListGap}>
            {filteredUpcoming.map((row) => (
              <View key={row.id} style={styles.savedListCard}>
                <View style={styles.savedListRow}>
                  <Image source={{ uri: row.uri }} style={styles.savedListThumb} />
                  <View style={{ flex: 1 }}>
                    <View style={styles.bookingBadgeRow}>
                      {row.status === 'booked' ? (
                        <View style={styles.badgeBooked}>
                          <Text style={styles.badgeBookedTxt}>BOOKED</Text>
                        </View>
                      ) : (
                        <View style={styles.badgeWait}>
                          <Text style={styles.badgeWaitTxt}>WAITLISTED</Text>
                        </View>
                      )}
                      {row.status === 'booked' ? (
                        <Pressable style={styles.qrMini}>
                          <FontAwesome name="qrcode" size={10} color={DS.color.gold} />
                        </Pressable>
                      ) : null}
                    </View>
                    <Text style={styles.savedListDateGold}>{row.dateLine}</Text>
                    <Text style={styles.savedListTitle}>{row.title}</Text>
                    <View style={styles.savedListMeta}>
                      <View style={styles.savedMetaItem}>
                        <FontAwesome name="clock-o" size={9} color={DS.color.textMuted} />
                        <Text style={styles.savedMetaTxt}>{row.time}</Text>
                      </View>
                      <View style={styles.savedMetaItem}>
                        <FontAwesome name="map-marker" size={9} color={DS.color.textMuted} />
                        <Text style={styles.savedMetaTxt}>{row.place}</Text>
                      </View>
                    </View>
                    <View style={styles.savedListActions}>
                      <Pressable
                        style={styles.bookingGhostBtn}
                        onPress={() =>
                          navigation.navigate('EventDetails', {
                            title: row.title,
                            imageUri: row.uri,
                            dateShort: `${row.dateLine} • ${row.time}`,
                          })
                        }
                      >
                        <Text style={styles.bookingGhostBtnTxt}>View Details</Text>
                      </Pressable>
                      {row.status === 'booked' ? (
                        <Pressable
                          style={styles.bookingCancelBtn}
                          onPress={() => setUpcoming((u) => u.filter((x) => x.id !== row.id))}
                        >
                          <Text style={styles.bookingCancelTxt}>Cancel</Text>
                        </Pressable>
                      ) : (
                        <Pressable
                          style={styles.bookingWaitlistBtn}
                          onPress={() => setUpcoming((u) => u.filter((x) => x.id !== row.id))}
                        >
                          <Text style={styles.bookingWaitlistTxt}>Leave Waitlist</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.savedListGap}>
            {MY_BOOKINGS_PAST_FROM_HTML.map((row) => (
              <View key={row.id} style={[styles.savedListCard, row.status === 'cancelled' && styles.pastCardMuted]}>
                <View style={styles.savedListRow}>
                  <Image
                    source={{ uri: row.uri }}
                    style={[styles.savedListThumb, styles.pastThumbDim]}
                  />
                  <View style={{ flex: 1 }}>
                    <View style={styles.bookingBadgeRow}>
                      {row.status === 'completed' ? (
                        <View style={styles.badgeCompleted}>
                          <Text style={styles.badgeCompletedTxt}>COMPLETED</Text>
                        </View>
                      ) : (
                        <View style={styles.badgeCancelled}>
                          <Text style={styles.badgeCancelledTxt}>CANCELLED</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.savedListDateDim}>{row.dateLine}</Text>
                    <Text style={styles.savedListTitleDim}>{row.title}</Text>
                    <View style={styles.savedListMeta}>
                      <View style={styles.savedMetaItem}>
                        <FontAwesome name="clock-o" size={9} color={DS.color.textMuted} />
                        <Text style={styles.savedMetaTxtDim}>{row.time}</Text>
                      </View>
                      <View style={styles.savedMetaItem}>
                        <FontAwesome name="map-marker" size={9} color={DS.color.textMuted} />
                        <Text style={styles.savedMetaTxtDim}>{row.place}</Text>
                      </View>
                    </View>
                    <View style={styles.savedListActions}>
                      <Pressable
                        style={styles.bookingGhostBtn}
                        onPress={() =>
                          navigation.navigate('EventDetails', {
                            title: row.title,
                            imageUri: row.uri,
                            dateShort: row.dateLine,
                          })
                        }
                      >
                        <Text style={styles.bookingGhostBtnTxtDim}>View Details</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        <Pressable style={styles.browseMoreWrap} onPress={() => navigation.navigate('UpcomingEvents')}>
          <Text style={styles.gold}>Browse more events</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: DS.color.background,
  },
  eventsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: DS.color.background,
  },
  eventsTitle: {
    ...tabRootTitleText,
  },
  eventsHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.space.sm,
  },
  eventsIconBtnSm: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: DS.color.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: DS.color.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventsScroll: {
    flex: 1,
  },
  eventsBody: {
    padding: DS.space.lg,
    flexGrow: 1,
  },
  sectionKicker: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 11,
    fontWeight: '600',
    color: DS.color.gold,
    letterSpacing: 3,
    marginBottom: DS.space.base,
  },
  eventGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: DS.space.base,
    marginBottom: DS.space.xl,
  },
  eventCell: {
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: DS.color.borderWhite5,
    backgroundColor: DS.color.surface,
  },
  eventImg: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  eventGrad: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  eventCopy: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: DS.space.base,
  },
  eventDate: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 12,
    color: DS.color.gold,
    marginBottom: 4,
  },
  eventName: {
    fontFamily: DS.font.heading,
    fontSize: 18,
    color: DS.color.text,
    letterSpacing: 0.5,
  },
  eventSub: {
    fontFamily: DS.font.body,
    fontSize: 10,
    color: DS.color.textMuted,
    marginTop: 4,
  },
  eventsFlowLinks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: DS.space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: DS.color.borderWhite5,
  },
  eventsFlowLink: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 14,
    color: DS.color.gold,
  },
  linkText: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 16,
    color: DS.color.text,
    fontWeight: '600',
  },
  padded: {
    padding: DS.space.lg,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: DS.space.lg,
  },
  gold: {
    color: DS.color.gold,
    fontWeight: '600',
  },
  detailHero: {
    width: '100%',
    height: 200,
    borderRadius: DS.radius.xl,
    marginBottom: DS.space.lg,
  },
  detailTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: DS.color.text,
    letterSpacing: 1,
    marginBottom: DS.space.sm,
  },
  muted: {
    color: DS.color.textMuted,
    fontSize: 14,
    marginBottom: DS.space.lg,
  },
  body: {
    fontSize: 15,
    lineHeight: 24,
    color: DS.color.text,
    marginBottom: DS.space.xl,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: DS.space.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DS.color.borderHairline,
  },
  rowTitle: {
    ...tabRootTitleText,
    flex: 1,
    textAlign: 'center',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: DS.space.xl,
  },
  bookingCard: {
    backgroundColor: DS.color.surface,
    padding: DS.space.lg,
    borderRadius: DS.radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: DS.color.cardBorder,
    marginBottom: DS.space.lg,
  },
  detailNavHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: DS.space.lg,
    paddingBottom: DS.space.base,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DS.color.borderWhite5,
    backgroundColor: DS.color.background,
  },
  headerRoundBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailHeroTall: {
    height: 280,
    position: 'relative',
    marginBottom: DS.space.lg,
  },
  detailHeroFill: {
    width: '100%',
    height: '100%',
  },
  detailHeroScrimTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '42%',
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  detailHeroScrimBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '62%',
    backgroundColor: 'rgba(0,0,0,0.82)',
  },
  detailHeroTextWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: DS.space.lg,
  },
  detailHeroDate: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 14,
    color: DS.color.gold,
    marginBottom: DS.space.sm,
  },
  detailHeroTitle: {
    fontFamily: DS.font.heading,
    fontSize: 36,
    color: DS.color.white,
    letterSpacing: 1,
    lineHeight: 38,
  },
  detailHeroTitleGold: {
    color: DS.color.gold,
  },
  detailHeroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  detailHeroMetaRowSpread: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: DS.space.md,
  },
  detailHeroMetaGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  detailHeroMeta: {
    fontFamily: DS.font.body,
    fontSize: 12,
    color: DS.color.text,
  },
  detailHeroMetaDim: {
    fontFamily: DS.font.body,
    fontSize: 12,
    color: DS.color.textMuted,
  },
  detailPad: {
    paddingHorizontal: DS.space.lg,
  },
  coachCard: {
    flexDirection: 'row',
    gap: DS.space.base,
    backgroundColor: DS.color.surfaceAlt,
    borderRadius: 12,
    padding: DS.space.base,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: DS.color.borderWhite5,
    marginBottom: DS.space.lg,
  },
  coachAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: DS.color.goldTint30,
  },
  coachName: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 16,
    color: DS.color.white,
  },
  coachVerifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 6,
  },
  coachVerified: {
    fontFamily: DS.font.body,
    fontSize: 11,
    color: DS.color.gold,
  },
  coachBio: {
    fontFamily: DS.font.body,
    fontSize: 12,
    color: DS.color.textMuted,
    lineHeight: 18,
  },
  quickStatsRow: {
    flexDirection: 'row',
    gap: DS.space.base,
    marginBottom: DS.space.xl,
  },
  quickStat: {
    flex: 1,
    backgroundColor: DS.color.surfaceAlt,
    borderRadius: 10,
    padding: DS.space.base,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: DS.color.borderWhite5,
  },
  quickStatLabel: {
    fontFamily: DS.font.body,
    fontSize: 12,
    color: DS.color.textMuted,
    marginTop: DS.space.sm,
  },
  quickStatVal: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 14,
    color: DS.color.white,
    marginTop: 4,
  },
  detailSectionKicker: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 11,
    color: DS.color.gold,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: DS.space.md,
    marginTop: DS.space.md,
  },
  detailBody: {
    fontFamily: DS.font.body,
    fontSize: 14,
    color: DS.color.textMuted,
    lineHeight: 22,
    marginBottom: DS.space.md,
  },
  agendaRow: {
    flexDirection: 'row',
    gap: DS.space.md,
    marginBottom: DS.space.md,
  },
  agendaNum: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: DS.color.goldTint10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  agendaNumText: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 12,
    color: DS.color.gold,
  },
  agendaTitle: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 14,
    color: DS.color.text,
  },
  agendaTime: {
    fontFamily: DS.font.body,
    fontSize: 11,
    color: DS.color.textMuted,
    marginTop: 2,
  },
  bringGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: DS.space.md,
    marginBottom: DS.space.sm,
  },
  bringGridCell: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.space.sm,
  },
  faqBlock: {
    paddingBottom: DS.space.md,
    marginBottom: DS.space.md,
  },
  faqBlockBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  faqQ: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 14,
    color: DS.color.white,
    marginBottom: DS.space.sm,
  },
  faqA: {
    fontFamily: DS.font.body,
    fontSize: 12,
    color: DS.color.textMuted,
    lineHeight: 18,
  },
  calInlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: DS.space.md,
    backgroundColor: DS.color.borderWhite5,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingVertical: DS.space.base,
    marginTop: DS.space.lg,
    marginBottom: DS.space.xl,
  },
  calInlineBtnText: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 14,
    color: DS.color.white,
  },
  bringText: {
    fontFamily: DS.font.body,
    fontSize: 14,
    color: DS.color.text,
  },
  eventStickyFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: DS.space.lg,
    paddingTop: DS.space.md,
    backgroundColor: DS.color.scrimBottom,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: DS.color.borderWhite5,
  },
  calOutlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: DS.space.md,
    borderRadius: DS.radius.lg,
    borderWidth: 1,
    borderColor: DS.color.gold,
    marginBottom: DS.space.sm,
  },
  calOutlineText: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 14,
    color: DS.color.gold,
  },
  saveLaterOutlineBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: DS.space.base,
    borderRadius: DS.radius.lg,
    borderWidth: 1,
    borderColor: DS.color.gold,
    backgroundColor: 'transparent',
  },
  saveLaterOutlineText: {
    fontFamily: DS.font.heading,
    fontSize: 16,
    color: DS.color.gold,
    letterSpacing: 1,
  },
  confirmSummary: {
    flexDirection: 'row',
    gap: DS.space.md,
    marginBottom: DS.space.xl,
    backgroundColor: DS.color.surface,
    padding: DS.space.md,
    borderRadius: DS.radius.lg,
  },
  confirmEventCard: {
    backgroundColor: DS.color.surface,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: DS.color.borderWhite5,
    padding: DS.space.base,
    marginBottom: DS.space.xl,
  },
  confirmEventCardInner: {
    flexDirection: 'row',
    gap: DS.space.base,
  },
  confirmThumb: {
    width: 72,
    height: 72,
    borderRadius: DS.radius.md,
  },
  confirmThumbLg: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  confirmEventTitle: {
    fontFamily: DS.font.heading,
    fontSize: 20,
    color: DS.color.white,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  confirmMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  confirmMetaText: {
    fontFamily: DS.font.body,
    fontSize: 11,
    color: DS.color.text,
    flex: 1,
  },
  confirmFieldLabel: {
    fontFamily: DS.font.body,
    fontSize: 12,
    color: DS.color.textMuted,
    marginBottom: DS.space.sm,
    marginTop: DS.space.sm,
  },
  levelList: {
    gap: DS.space.sm,
  },
  levelPill: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: DS.color.input,
    paddingVertical: DS.space.md,
    paddingHorizontal: DS.space.base,
  },
  levelPillOn: {
    borderColor: DS.color.gold,
    backgroundColor: DS.color.goldTint10,
  },
  levelPillTxt: {
    fontFamily: DS.font.body,
    fontSize: 14,
    color: DS.color.textMuted,
  },
  levelPillTxtOn: {
    color: DS.color.gold,
    fontWeight: '600',
  },
  optionalMuted: {
    color: 'rgba(212,208,200,0.45)',
    fontWeight: '400',
  },
  consentCard: {
    backgroundColor: DS.color.surface,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: DS.color.borderWhite5,
    padding: DS.space.base,
    marginTop: DS.space.lg,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: DS.space.md,
  },
  checkboxMd: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  consentText: {
    flex: 1,
    fontFamily: DS.font.body,
    fontSize: 12,
    color: DS.color.text,
    lineHeight: 18,
  },
  consentLink: {
    color: DS.color.gold,
    textDecorationLine: 'underline',
  },
  policyBoxStrong: {
    flexDirection: 'row',
    gap: DS.space.md,
    backgroundColor: DS.color.borderWhite5,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: DS.color.borderWhite5,
    padding: DS.space.base,
    marginTop: DS.space.lg,
    marginBottom: DS.space.lg,
  },
  policyTitle: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 12,
    color: DS.color.white,
    marginBottom: 4,
  },
  policyTextStrong: {
    fontFamily: DS.font.body,
    fontSize: 11,
    color: DS.color.textMuted,
    lineHeight: 17,
  },
  cancelOutlineBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: DS.space.base,
    borderRadius: DS.radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    marginBottom: DS.space.xl,
  },
  cancelOutlineBtnText: {
    fontFamily: DS.font.heading,
    fontSize: 16,
    color: DS.color.white,
    letterSpacing: 1,
  },
  inputLabel: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 11,
    color: DS.color.gold,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: DS.space.sm,
    marginTop: DS.space.sm,
  },
  textIn: {
    backgroundColor: DS.color.input,
    borderRadius: DS.radius.lg,
    padding: DS.space.base,
    fontFamily: DS.font.body,
    fontSize: 16,
    color: DS.color.text,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.space.md,
    marginTop: DS.space.lg,
  },
  checkboxSm: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: DS.color.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSmOn: {
    backgroundColor: DS.color.gold,
    borderColor: DS.color.gold,
  },
  policyBox: {
    flexDirection: 'row',
    gap: DS.space.md,
    backgroundColor: DS.color.surface,
    padding: DS.space.md,
    borderRadius: DS.radius.lg,
    marginTop: DS.space.lg,
    marginBottom: DS.space.lg,
  },
  policyText: {
    flex: 1,
    fontFamily: DS.font.body,
    fontSize: 13,
    color: DS.color.textMuted,
    lineHeight: 20,
  },
  cancelTextBtn: {
    alignItems: 'center',
    paddingVertical: DS.space.md,
  },
  bookingTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: DS.space.lg,
    paddingBottom: DS.space.md,
  },
  successCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: DS.color.gold,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: DS.space.lg,
  },
  successHead: {
    fontFamily: DS.font.heading,
    fontSize: 28,
    color: DS.color.gold,
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: DS.space.sm,
  },
  bodyCenter: {
    fontFamily: DS.font.body,
    fontSize: 15,
    color: DS.color.textMuted,
    textAlign: 'center',
    marginBottom: DS.space.xl,
  },
  refLabel: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 11,
    color: DS.color.gold,
    letterSpacing: 2,
    textAlign: 'center',
  },
  refCode: {
    fontFamily: DS.font.bodyBold,
    fontSize: 22,
    color: DS.color.text,
    textAlign: 'center',
    letterSpacing: 4,
    marginBottom: DS.space.lg,
  },
  qrPlaceholder: {
    alignSelf: 'center',
    width: 200,
    height: 200,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: DS.color.border,
    borderRadius: DS.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: DS.space.xl,
    backgroundColor: DS.color.surface,
  },
  nextStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: DS.space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DS.color.borderWhite5,
  },
  bookingConfirmHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: DS.space.lg,
    paddingBottom: DS.space.base,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DS.color.borderWhite5,
    backgroundColor: DS.color.background,
  },
  bookingConfirmBody: {
    paddingHorizontal: DS.space.lg,
    paddingTop: DS.space.lg,
  },
  successHero: {
    alignItems: 'center',
    paddingVertical: DS.space.xl,
  },
  successCircleLg: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: DS.color.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: DS.space.lg,
  },
  successHeadLg: {
    fontFamily: DS.font.heading,
    fontSize: 32,
    color: DS.color.white,
    textAlign: 'center',
    letterSpacing: 1,
    marginBottom: DS.space.sm,
  },
  bodyCenterTight: {
    fontFamily: DS.font.body,
    fontSize: 14,
    color: DS.color.textMuted,
    textAlign: 'center',
  },
  refGradientCard: {
    borderRadius: 16,
    padding: DS.space.lg,
    marginBottom: DS.space.xl,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.35)',
    backgroundColor: 'rgba(212,175,55,0.08)',
    alignItems: 'center',
  },
  refCodeLg: {
    fontFamily: DS.font.heading,
    fontSize: 28,
    color: DS.color.white,
    letterSpacing: 2,
    marginBottom: DS.space.lg,
  },
  qrWhiteWrap: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: DS.space.base,
  },
  qrInner: {
    width: 128,
    height: 128,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrHint: {
    fontFamily: DS.font.body,
    fontSize: 11,
    color: DS.color.textMuted,
    marginTop: DS.space.md,
    textAlign: 'center',
  },
  attendeeCard: {
    backgroundColor: DS.color.borderWhite5,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: DS.color.borderWhite5,
    padding: DS.space.base,
    marginBottom: DS.space.lg,
  },
  attendeeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  attendeeLabel: {
    fontFamily: DS.font.body,
    fontSize: 12,
    color: DS.color.textMuted,
  },
  attendeeVal: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 13,
    color: DS.color.white,
    maxWidth: '62%',
    textAlign: 'right',
  },
  attendeeValEmail: {
    fontWeight: '400',
  },
  emailSentCard: {
    flexDirection: 'row',
    gap: DS.space.md,
    backgroundColor: DS.color.surface,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: DS.color.borderWhite5,
    padding: DS.space.base,
    marginBottom: DS.space.xl,
  },
  emailSentTitle: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 13,
    color: DS.color.white,
    marginBottom: 4,
  },
  emailSentBody: {
    fontFamily: DS.font.body,
    fontSize: 11,
    color: DS.color.textMuted,
    lineHeight: 17,
  },
  nextStepRich: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.space.md,
    backgroundColor: DS.color.borderWhite5,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingVertical: DS.space.md,
    paddingHorizontal: DS.space.base,
    marginBottom: DS.space.sm,
  },
  nextStepIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: DS.color.goldTint10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextStepTitle: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 13,
    color: DS.color.white,
  },
  nextStepSub: {
    fontFamily: DS.font.body,
    fontSize: 11,
    color: DS.color.textMuted,
    marginTop: 2,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: DS.color.borderWhite5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedScrollPad: {
    paddingHorizontal: DS.space.lg,
    paddingTop: DS.space.lg,
  },
  segmentWrap: {
    flexDirection: 'row',
    backgroundColor: DS.color.surface,
    borderRadius: 12,
    padding: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: DS.color.borderWhite5,
    marginBottom: DS.space.lg,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  segmentBtnOn: {
    backgroundColor: DS.color.gold,
  },
  segmentTxt: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 12,
    color: DS.color.textMuted,
  },
  segmentTxtOn: {
    color: DS.color.background,
  },
  savedSearchField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DS.color.surface,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 12,
    paddingHorizontal: DS.space.md,
    paddingLeft: 40,
    marginBottom: DS.space.lg,
    position: 'relative',
  },
  savedSearchIcon: {
    position: 'absolute',
    left: 14,
  },
  savedSearchInput: {
    flex: 1,
    fontFamily: DS.font.body,
    fontSize: 15,
    color: DS.color.text,
    paddingVertical: 0,
  },
  savedListGap: {
    gap: DS.space.base,
  },
  savedListCard: {
    backgroundColor: DS.color.surface,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: DS.color.borderWhite5,
    padding: DS.space.base,
  },
  savedListRow: {
    flexDirection: 'row',
    gap: DS.space.base,
  },
  savedListThumb: {
    width: 64,
    height: 64,
    borderRadius: 8,
  },
  savedListTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  savedListDateGold: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 11,
    color: DS.color.gold,
    letterSpacing: 2,
    marginBottom: 4,
  },
  savedListTitle: {
    fontFamily: DS.font.heading,
    fontSize: 18,
    color: DS.color.white,
    letterSpacing: 0.5,
  },
  savedBookmarkMini: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: DS.color.borderWhite5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedListMeta: {
    flexDirection: 'row',
    gap: DS.space.lg,
    marginTop: DS.space.sm,
  },
  savedMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  savedMetaTxt: {
    fontFamily: DS.font.body,
    fontSize: 11,
    color: DS.color.textMuted,
  },
  savedListActions: {
    flexDirection: 'row',
    gap: DS.space.sm,
    marginTop: DS.space.md,
  },
  savedAttendSm: {
    flex: 1,
    backgroundColor: DS.color.gold,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  savedAttendSmTxt: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 11,
    color: DS.color.background,
    fontWeight: '700',
  },
  savedUnsaveBtn: {
    paddingHorizontal: DS.space.base,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: DS.color.borderWhite5,
  },
  savedUnsaveTxt: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 11,
    color: DS.color.textMuted,
  },
  emptyStateWrap: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: DS.space.lg,
  },
  emptyStateCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: DS.color.borderWhite5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: DS.space.lg,
  },
  emptyStateTitle: {
    fontFamily: DS.font.heading,
    fontSize: 24,
    color: DS.color.white,
    marginBottom: DS.space.sm,
  },
  emptyStateBody: {
    fontFamily: DS.font.body,
    fontSize: 13,
    color: DS.color.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: DS.space.lg,
  },
  emptyStateCta: {
    backgroundColor: DS.color.gold,
    paddingHorizontal: DS.space.lg,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyStateCtaTxt: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 13,
    color: DS.color.background,
    fontWeight: '600',
  },
  bookingBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  badgeBooked: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeBookedTxt: {
    fontFamily: DS.font.bodyBold,
    fontSize: 9,
    color: DS.color.background,
    letterSpacing: 0.5,
  },
  badgeWait: {
    backgroundColor: '#f97316',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeWaitTxt: {
    fontFamily: DS.font.bodyBold,
    fontSize: 9,
    color: DS.color.background,
    letterSpacing: 0.5,
  },
  qrMini: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: DS.color.goldTint10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookingGhostBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: DS.color.borderWhite5,
    alignItems: 'center',
  },
  bookingGhostBtnTxt: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 11,
    color: DS.color.text,
  },
  bookingGhostBtnTxtDim: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 11,
    color: 'rgba(212,208,200,0.55)',
  },
  bookingCancelBtn: {
    paddingHorizontal: DS.space.md,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(239,68,68,0.2)',
  },
  bookingCancelTxt: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 11,
    color: '#f87171',
  },
  bookingWaitlistBtn: {
    paddingHorizontal: DS.space.md,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(249,115,22,0.2)',
  },
  bookingWaitlistTxt: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 11,
    color: '#fb923c',
  },
  pastCardMuted: {
    opacity: 0.92,
  },
  pastThumbDim: {
    opacity: 0.6,
  },
  savedListDateDim: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 11,
    color: 'rgba(212,208,200,0.45)',
    letterSpacing: 2,
    marginBottom: 4,
  },
  savedListTitleDim: {
    fontFamily: DS.font.heading,
    fontSize: 18,
    color: 'rgba(212,208,200,0.65)',
    letterSpacing: 0.5,
  },
  savedMetaTxtDim: {
    fontFamily: DS.font.body,
    fontSize: 11,
    color: 'rgba(212,208,200,0.45)',
  },
  badgeCompleted: {
    backgroundColor: '#6b7280',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeCompletedTxt: {
    fontFamily: DS.font.bodyBold,
    fontSize: 9,
    color: '#fff',
    letterSpacing: 0.5,
  },
  badgeCancelled: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeCancelledTxt: {
    fontFamily: DS.font.bodyBold,
    fontSize: 9,
    color: '#fff',
    letterSpacing: 0.5,
  },
  browseMoreWrap: {
    marginTop: DS.space.xl,
    alignItems: 'center',
  },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: DS.space.lg,
    marginBottom: DS.space.md,
    gap: DS.space.sm,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: DS.space.sm,
    borderRadius: DS.radius.lg,
    backgroundColor: DS.color.surface,
    alignItems: 'center',
  },
  tabBtnOn: {
    backgroundColor: DS.color.goldTint10,
    borderWidth: 1,
    borderColor: DS.color.gold,
  },
  tabTxt: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 13,
    color: DS.color.textMuted,
    textTransform: 'capitalize',
  },
  tabTxtOn: {
    color: DS.color.gold,
  },
  savedSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.space.md,
    backgroundColor: DS.color.input,
    borderRadius: DS.radius.lg,
    padding: DS.space.md,
    marginBottom: DS.space.lg,
  },
  savedSearchPh: {
    fontFamily: DS.font.body,
    fontSize: 14,
    color: DS.color.textMuted,
  },
  savedCard: {
    flexDirection: 'row',
    gap: DS.space.md,
    backgroundColor: DS.color.surface,
    borderRadius: DS.radius.xl,
    padding: DS.space.md,
    marginBottom: DS.space.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: DS.color.borderWhite5,
  },
  savedThumb: {
    width: 88,
    height: 88,
    borderRadius: DS.radius.md,
  },
  savedDate: {
    fontFamily: DS.font.body,
    fontSize: 12,
    color: DS.color.gold,
    marginBottom: 4,
  },
  savedActions: {
    flexDirection: 'row',
    gap: DS.space.sm,
    marginTop: DS.space.md,
  },
  savedAttend: {
    flex: 1,
    backgroundColor: DS.color.gold,
    paddingVertical: DS.space.sm,
    borderRadius: DS.radius.md,
    alignItems: 'center',
  },
  savedAttendTxt: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 13,
    color: DS.color.background,
    fontWeight: '700',
  },
  savedRemove: {
    flex: 1,
    borderWidth: 1,
    borderColor: DS.color.border,
    paddingVertical: DS.space.sm,
    borderRadius: DS.radius.md,
    alignItems: 'center',
  },
  savedRemoveTxt: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 13,
    color: DS.color.textMuted,
  },
  attendingBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(34,197,94,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: DS.space.sm,
  },
  attendingBadgeTxt: {
    fontFamily: DS.font.bodyBold,
    fontSize: 10,
    color: '#22c55e',
    letterSpacing: 1,
  },
  savedOutline: {
    flex: 1,
    borderWidth: 1,
    borderColor: DS.color.gold,
    paddingVertical: DS.space.sm,
    borderRadius: DS.radius.md,
    alignItems: 'center',
  },
  savedOutlineTxt: {
    fontFamily: DS.font.bodyMedium,
    fontSize: 13,
    color: DS.color.gold,
  },
  thumbTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: DS.color.text,
  },
});
