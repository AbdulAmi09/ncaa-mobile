import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

type Profile = {
  first_name: string | null;
  last_name: string | null;
  arbiter_level: string | null;
};

type ActivitySummary = {
  pending_assignments: number | null;
  pending_payments: number | null;
  next_assignment_date: string | null;
};

type UpcomingAssignment = {
  id: string;
  tournament_name: string | null;
  venue: string | null;
  start_date: string | null;
  assignment_status: string | null;
};

type NotificationRow = {
  id: string;
  title: string | null;
  message: string | null;
  created_at: string;
  is_read: boolean | null;
};

function formatDate(dateString: string | null) {
  if (!dateString) return null;
  return new Date(dateString).toLocaleDateString('en-NG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function formatNaira(amount: number | null) {
  const value = amount ?? 0;
  return `₦${value.toLocaleString('en-NG')}`;
}

export default function HomeScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const userId = session?.user.id;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [summary, setSummary] = useState<ActivitySummary | null>(null);
  const [nextAssignment, setNextAssignment] = useState<UpcomingAssignment | null>(null);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoadError(false);
    const today = new Date().toISOString().split('T')[0];

    const [profileRes, summaryRes, assignmentRes, notificationsRes] = await Promise.all([
      supabase.from('profiles').select('first_name, last_name, arbiter_level').eq('id', userId).single(),
      supabase.rpc('get_arbiter_activity_summary', { arbiter_uuid: userId }).single<ActivitySummary>(),
      supabase
        .from('assignment_details')
        .select('id, tournament_name, venue, start_date, assignment_status')
        .eq('arbiter_id', userId)
        .gte('start_date', today)
        .order('start_date', { ascending: true })
        .limit(1)
        .maybeSingle<UpcomingAssignment>(),
      supabase
        .from('notifications')
        .select('id, title, message, created_at, is_read')
        .eq('recipient_id', userId)
        .order('created_at', { ascending: false })
        .limit(3),
    ]);

    if (profileRes.error || summaryRes.error || assignmentRes.error || notificationsRes.error) {
      setLoadError(true);
    }

    setProfile(profileRes.data ?? null);
    setSummary(summaryRes.data ?? null);
    setNextAssignment(assignmentRes.data ?? null);
    setNotifications((notificationsRes.data as NotificationRow[]) ?? []);
    setLoading(false);
    setRefreshing(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const firstName = profile?.first_name ?? 'there';

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          <ThemedText type="title">Hello, {firstName}</ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.subGreeting}>
            Here is what's happening with your arbiter account.
          </ThemedText>

          {loadError && (
            <ThemedView type="backgroundElement" style={styles.card}>
              <ThemedText themeColor="danger">
                We could not load your latest information. Pull down to try again.
              </ThemedText>
            </ThemedView>
          )}

          {!loading && (
            <>
              <ThemedView type="backgroundElement" style={styles.card}>
                <ThemedText type="heading">Your next assignment</ThemedText>
                {nextAssignment ? (
                  <>
                    <ThemedText style={styles.cardSpacing}>
                      {nextAssignment.tournament_name ?? 'Tournament'}
                    </ThemedText>
                    <ThemedText themeColor="textSecondary">
                      {formatDate(nextAssignment.start_date)}
                      {nextAssignment.venue ? ` · ${nextAssignment.venue}` : ''}
                    </ThemedText>
                  </>
                ) : (
                  <ThemedText themeColor="textSecondary" style={styles.cardSpacing}>
                    You have no upcoming assignments right now.
                  </ThemedText>
                )}
              </ThemedView>

              <ThemedView style={styles.summaryRow}>
                <ThemedView type="backgroundElement" style={[styles.card, styles.summaryTile]}>
                  <ThemedText themeColor="textSecondary" type="small">
                    Pending assignments
                  </ThemedText>
                  <ThemedText type="heading" style={styles.cardSpacing}>
                    {summary?.pending_assignments ?? 0}
                  </ThemedText>
                </ThemedView>
                <ThemedView type="backgroundElement" style={[styles.card, styles.summaryTile]}>
                  <ThemedText themeColor="textSecondary" type="small">
                    Pending payments
                  </ThemedText>
                  <ThemedText type="heading" style={styles.cardSpacing}>
                    {formatNaira(summary?.pending_payments ?? 0)}
                  </ThemedText>
                </ThemedView>
              </ThemedView>

              <ThemedView style={styles.notificationsSection}>
                <ThemedText type="heading">Recent notifications</ThemedText>
                {notifications.length === 0 ? (
                  <ThemedText themeColor="textSecondary" style={styles.cardSpacing}>
                    Nothing new right now.
                  </ThemedText>
                ) : (
                  notifications.map((note) => (
                    <ThemedView
                      key={note.id}
                      type="backgroundElement"
                      style={[styles.card, styles.notificationCard]}>
                      <ThemedText type="smallBold">{note.title ?? 'Notification'}</ThemedText>
                      {!!note.message && (
                        <ThemedText themeColor="textSecondary" style={styles.cardSpacing}>
                          {note.message}
                        </ThemedText>
                      )}
                    </ThemedView>
                  ))
                )}
              </ThemedView>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.four,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  subGreeting: { marginTop: -Spacing.two },
  card: {
    borderRadius: 16,
    padding: Spacing.four,
  },
  cardSpacing: { marginTop: Spacing.one },
  summaryRow: { flexDirection: 'row', gap: Spacing.three },
  summaryTile: { flex: 1 },
  notificationsSection: { gap: Spacing.two },
  notificationCard: { gap: Spacing.half },
});
