import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, MinTouchTarget, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

type Profile = {
  first_name: string | null;
  last_name: string | null;
  arbiter_level: string | null;
  avatar_url: string | null;
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

function initials(first: string | null, last: string | null) {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase() || '?';
}

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
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user.id;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [summary, setSummary] = useState<ActivitySummary | null>(null);
  const [nextAssignment, setNextAssignment] = useState<UpcomingAssignment | null>(null);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoadError(false);
    const today = new Date().toISOString().split('T')[0];

    const [profileRes, summaryRes, assignmentRes, notificationsRes, unreadRes] = await Promise.all([
      supabase.from('profiles').select('first_name, last_name, arbiter_level, avatar_url').eq('id', userId).single(),
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
      supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('recipient_id', userId)
        .eq('is_read', false),
    ]);

    if (profileRes.error || summaryRes.error || assignmentRes.error || notificationsRes.error) {
      setLoadError(true);
    }

    setProfile(profileRes.data ?? null);
    setSummary(summaryRes.data ?? null);
    setNextAssignment(assignmentRes.data ?? null);
    setNotifications((notificationsRes.data as NotificationRow[]) ?? []);
    setUnreadCount(unreadRes.count ?? 0);
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
          <ThemedView style={styles.headerRow}>
            <ThemedView style={styles.headerLeft}>
              <ThemedView type="backgroundSelected" style={styles.avatar}>
                {profile?.avatar_url ? (
                  <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
                ) : (
                  <ThemedText type="smallBold" style={{ color: theme.primary }}>
                    {initials(profile?.first_name ?? null, profile?.last_name ?? null)}
                  </ThemedText>
                )}
              </ThemedView>
              <ThemedView>
                <ThemedText type="title">Hello, {firstName}</ThemedText>
                {!!profile?.arbiter_level && (
                  <ThemedText themeColor="textSecondary" type="small">
                    {profile.arbiter_level}
                  </ThemedText>
                )}
              </ThemedView>
            </ThemedView>

            <Pressable
              onPress={() => router.push('/notifications')}
              hitSlop={8}
              style={[styles.bellButton, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <Ionicons name="notifications-outline" size={22} color={theme.text} />
              {unreadCount > 0 && (
                <ThemedView style={[styles.bellBadge, { backgroundColor: theme.danger }]}>
                  <ThemedText type="small" style={{ color: '#fff', fontSize: 10, lineHeight: 12 }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </ThemedText>
                </ThemedView>
              )}
            </Pressable>
          </ThemedView>

          <ThemedView style={styles.quickActions}>
            <QuickAction icon="calendar" label="Assignments" onPress={() => router.push('/assignments')} />
            <QuickAction icon="cash" label="Payments" onPress={() => router.push('/payments')} />
            <QuickAction icon="chatbubbles" label="Chat" onPress={() => router.push('/chat')} />
          </ThemedView>

          <Card style={styles.moreRow}>
            <MoreLink icon="megaphone-outline" label="Events" onPress={() => router.push('/events')} />
            <MoreLink icon="people-outline" label="Directory" onPress={() => router.push('/directory')} />
            <MoreLink icon="folder-outline" label="Resources" onPress={() => router.push('/resources')} />
          </Card>

          {loadError && (
            <Card>
              <ThemedText themeColor="danger">
                We could not load your latest information. Pull down to try again.
              </ThemedText>
            </Card>
          )}

          {!loading && (
            <>
              <Card>
                <ThemedView style={styles.sectionHeaderRow}>
                  <Ionicons name="calendar-outline" size={18} color={theme.primary} />
                  <ThemedText type="heading">Your next assignment</ThemedText>
                </ThemedView>
                {nextAssignment ? (
                  <>
                    <ThemedText type="smallBold" style={styles.cardSpacing}>
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
              </Card>

              <ThemedView style={styles.summaryRow}>
                <Card style={styles.summaryTile}>
                  <Ionicons name="time-outline" size={18} color={theme.warning} />
                  <ThemedText themeColor="textSecondary" type="small" style={styles.cardSpacing}>
                    Pending assignments
                  </ThemedText>
                  <ThemedText type="heading">{summary?.pending_assignments ?? 0}</ThemedText>
                </Card>
                <Card style={styles.summaryTile}>
                  <Ionicons name="cash-outline" size={18} color={theme.success} />
                  <ThemedText themeColor="textSecondary" type="small" style={styles.cardSpacing}>
                    Pending payments
                  </ThemedText>
                  <ThemedText type="heading">{formatNaira(summary?.pending_payments ?? 0)}</ThemedText>
                </Card>
              </ThemedView>

              <ThemedView style={styles.notificationsSection}>
                <ThemedView style={styles.notificationsHeaderRow}>
                  <ThemedText type="heading">Recent notifications</ThemedText>
                  <Pressable onPress={() => router.push('/notifications')}>
                    <ThemedText type="small" style={{ color: theme.primary }}>
                      See all
                    </ThemedText>
                  </Pressable>
                </ThemedView>
                {notifications.length === 0 ? (
                  <Card>
                    <ThemedText themeColor="textSecondary">Nothing new right now.</ThemedText>
                  </Card>
                ) : (
                  notifications.map((note) => (
                    <Card key={note.id} tone={note.is_read ? 'surface' : 'selected'} style={styles.notificationCard}>
                      <ThemedText type="smallBold">{note.title ?? 'Notification'}</ThemedText>
                      {!!note.message && (
                        <ThemedText themeColor="textSecondary" numberOfLines={2}>
                          {note.message}
                        </ThemedText>
                      )}
                    </Card>
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

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={styles.quickActionItem}>
      <ThemedView type="backgroundSelected" style={styles.quickActionIcon}>
        <Ionicons name={icon} size={22} color={theme.primary} />
      </ThemedView>
      <ThemedText type="small" style={styles.quickActionLabel}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

function MoreLink({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={styles.moreLinkItem}>
      <Ionicons name={icon} size={20} color={theme.text} />
      <ThemedText type="small" style={styles.moreLinkLabel}>
        {label}
      </ThemedText>
    </Pressable>
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
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, flexShrink: 1 },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  bellButton: {
    width: MinTouchTarget,
    height: MinTouchTarget,
    borderRadius: MinTouchTarget / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  quickActions: { flexDirection: 'row', justifyContent: 'space-between' },
  quickActionItem: { alignItems: 'center', gap: Spacing.one, flex: 1 },
  quickActionIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  quickActionLabel: { textAlign: 'center' },
  moreRow: { flexDirection: 'row', paddingVertical: Spacing.three },
  moreLinkItem: { flex: 1, alignItems: 'center', gap: Spacing.one },
  moreLinkLabel: { textAlign: 'center' },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  cardSpacing: { marginTop: Spacing.one },
  summaryRow: { flexDirection: 'row', gap: Spacing.three },
  summaryTile: { flex: 1 },
  notificationsSection: { gap: Spacing.two },
  notificationsHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  notificationCard: { gap: Spacing.half },
});
