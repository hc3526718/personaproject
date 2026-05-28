import { useEffect, useRef, useCallback } from 'react';
import { Alert, AppState, Platform, Vibration } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { isSupabaseConfigured } from '../lib/env';
import { getSupabase } from '../lib/supabase';
import { openEventDetails } from '../navigation/rootNavigationRef';
import type { InAppNotification } from '../roadmap/notificationsService';
import { listInAppNotifications } from '../roadmap/notificationsService';

function isEventUpdateNotification(n: Pick<InAppNotification, 'title' | 'link_type'>): boolean {
  const lt = (n.link_type ?? '').toLowerCase();
  if (lt === 'event') return true;
  return (n.title ?? '').toLowerCase().includes('event updated');
}

function buzz(): void {
  if (Platform.OS === 'android') {
    try {
      void Vibration.vibrate(280);
    } catch {
      /* ignore */
    }
  }
}

/**
 * Live popup when an event the user is booked on is updated (in-app notification INSERT).
 */
export function EventInAppAlerts() {
  const { user } = useAuth();
  const alertedIdsRef = useRef<Set<string>>(new Set());
  const prevUserRef = useRef<string | null>(null);

  const showEventAlert = useCallback((n: InAppNotification) => {
    const title = n.title?.trim() || 'Event updated';
    const subtitle = (n.body ?? '').trim();
    buzz();
    Alert.alert(title, subtitle || 'Open the event to see what changed.', [
      { text: 'Dismiss', style: 'cancel', onPress: () => undefined },
      {
        text: 'View event',
        onPress: () => {
          const eventId = (n.link_id ?? '').trim();
          if (eventId) openEventDetails(eventId);
        },
      },
    ]);
  }, []);

  useEffect(() => {
    if (!user?.id || user.id.startsWith('demo-') || !isSupabaseConfigured()) {
      prevUserRef.current = user?.id ?? null;
      return;
    }
    const supabase = getSupabase();
    if (!supabase) {
      prevUserRef.current = user?.id ?? null;
      return;
    }

    const justSignedIn = prevUserRef.current !== user.id;
    prevUserRef.current = user.id;

    if (justSignedIn) {
      void listInAppNotifications(user.id, 40).then((rows) => {
        const unread = rows.find((n) => !n.read_at && isEventUpdateNotification(n) && (n.link_id ?? '').trim());
        if (!unread || alertedIdsRef.current.has(unread.id)) return;
        alertedIdsRef.current.add(unread.id);
        showEventAlert(unread);
      });
    }

    const channel = supabase
      .channel(`event-inapp-alerts-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'in_app_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as InAppNotification | null;
          if (!row?.id) return;
          if (alertedIdsRef.current.has(row.id)) return;
          if (!isEventUpdateNotification(row)) return;
          if (AppState.currentState !== 'active') return;
          alertedIdsRef.current.add(row.id);
          showEventAlert(row);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id, showEventAlert]);

  return null;
}
