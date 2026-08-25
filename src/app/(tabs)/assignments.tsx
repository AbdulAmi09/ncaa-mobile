import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BigButton } from '@/components/big-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { type Assignment, fetchAssignments, respondToAssignment } from '@/lib/assignments';
import { useAuth } from '@/lib/auth-context';
import { getOrCreateDmRoom } from '@/lib/chat';
import type { ThemeColor } from '@/constants/theme';

type Filter = 'all' | 'Pending' | 'Accepted' | 'Completed';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'Pending', label: 'Needs response' },
  { key: 'Accepted', label: 'Confirmed' },
  { key: 'Completed', label: 'Completed' },
];

function statusColor(status: string): ThemeColor {
  switch (status) {
    case 'Accepted':
    case 'Completed':
      return 'success';
    case 'Pending':
      return 'warning';
    case 'Declined':
      return 'danger';
    default:
      return 'textSecondary';
  }
}

function formatDateRange(start: string, end: string) {
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' };
  const s = new Date(start).toLocaleDateString('en-NG', opts);
  if (!end || end === start) return s;
  const e = new Date(end).toLocaleDateString('en-NG', opts);
  return `${s} – ${e}`;
}

function formatNaira(amount: number | null) {
  if (!amount) return null;
  return `₦${amount.toLocaleString('en-NG')}`;
}

export default function AssignmentsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user.id;

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [messagingId, setMessagingId] = useState<string | null>(null);
  const [errorText, setErrorText] = useState('');

  const load = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await fetchAssignments(userId);
    if (error) setErrorText('We could not load your assignments. Pull down to try again.');
    else setErrorText('');
    setAssignments(data ?? []);
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

  const visible = useMemo(() => {
    const sorted = [...assignments].sort((a, b) => {
      if (a.assignment_status === 'Pending' && b.assignment_status !== 'Pending') return -1;
      if (b.assignment_status === 'Pending' && a.assignment_status !== 'Pending') return 1;
      return new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
    });
    if (filter === 'all') return sorted;
    return sorted.filter((a) => a.assignment_status === filter);
  }, [assignments, filter]);

  async function handleRespond(assignment: Assignment, status: 'Accepted' | 'Declined') {
    if (!userId) return;
    setRespondingId(assignment.id);
    const { error } = await respondToAssignment(assignment.id, userId, status);
    setRespondingId(null);
    if (error) {
      setErrorText("Couldn't update this assignment. Please try again.");
      return;
    }
    setAssignments((prev) =>
      prev.map((a) => (a.id === assignment.id ? { ...a, assignment_status: status } : a)),
    );
  }

  async function handleMessageOrganizer(assignment: Assignment) {
    if (!userId || !assignment.assigned_by) return;
    setMessagingId(assignment.id);
    const { data: roomId, error } = await getOrCreateDmRoom(userId, assignment.assigned_by);
    setMessagingId(null);
    if (error || !roomId) {
      setErrorText("Couldn't open a chat with the organizer. Please try again.");
      return;
    }
    router.push(`/chat/${roomId}`);
  }

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <ThemedText type="title" style={styles.header}>
          Assignments
        </ThemedText>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterRowContent}>
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => setFilter(f.key)}
                style={[
                  styles.filterChip,
                  { borderColor: theme.border, backgroundColor: active ? theme.primary : theme.backgroundElement },
                ]}>
                <ThemedText
                  type="smallBold"
                  style={{ color: active ? theme.primaryText : theme.text }}>
                  {f.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>

        {loading ? (
          <ActivityIndicator style={styles.loading} size="large" />
        ) : (
          <ScrollView
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
            {!!errorText && (
              <ThemedView type="backgroundElement" style={styles.card}>
                <ThemedText themeColor="danger">{errorText}</ThemedText>
              </ThemedView>
            )}

            {visible.length === 0 && !errorText && (
              <ThemedView type="backgroundElement" style={styles.card}>
                <ThemedText themeColor="textSecondary">
                  No assignments here right now.
                </ThemedText>
              </ThemedView>
            )}

            {visible.map((a) => (
              <ThemedView key={a.id} type="backgroundElement" style={styles.card}>
                <ThemedView style={styles.cardHeaderRow}>
                  <ThemedText type="heading" style={styles.tournamentName}>
                    {a.tournament_name}
                  </ThemedText>
                  <ThemedView type="background" style={[styles.badge, { borderColor: theme[statusColor(a.assignment_status)] }]}>
                    <ThemedText type="small" themeColor={statusColor(a.assignment_status)}>
                      {a.assignment_status}
                    </ThemedText>
                  </ThemedView>
                </ThemedView>

                <ThemedText themeColor="textSecondary" style={styles.detailLine}>
                  {formatDateRange(a.start_date, a.end_date)}
                </ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.detailLine}>
                  {[a.venue, a.city, a.state].filter(Boolean).join(', ') || 'Venue not set'}
                </ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.detailLine}>
                  Role: {a.role ?? 'Arbiter'}
                  {a.assigned_by_name ? ` · Assigned by ${a.assigned_by_name}` : ''}
                </ThemedText>

                {a.assignment_status === 'Pending' && (
                  <ThemedText themeColor="warning" style={styles.detailLine}>
                    Please confirm whether you can officiate this tournament.
                  </ThemedText>
                )}

                {(a.assignment_status === 'Accepted' || a.assignment_status === 'Completed') &&
                  (formatNaira(a.compensation) || formatNaira(a.travel_allowance)) && (
                    <ThemedText themeColor="textSecondary" style={styles.detailLine}>
                      {formatNaira(a.compensation) ? `Fee: ${formatNaira(a.compensation)}` : ''}
                      {formatNaira(a.travel_allowance) ? `  ·  Travel: ${formatNaira(a.travel_allowance)}` : ''}
                    </ThemedText>
                  )}

                {!!a.notes && (
                  <ThemedView type="backgroundSelected" style={styles.notesBox}>
                    <ThemedText type="small">{a.notes}</ThemedText>
                  </ThemedView>
                )}

                {a.assignment_status === 'Pending' && (
                  <ThemedView style={styles.actions}>
                    <BigButton
                      label="Accept assignment"
                      onPress={() => handleRespond(a, 'Accepted')}
                      loading={respondingId === a.id}
                      disabled={respondingId !== null}
                    />
                    <BigButton
                      label="Decline"
                      variant="secondary"
                      onPress={() => handleRespond(a, 'Declined')}
                      loading={false}
                      disabled={respondingId !== null}
                    />
                  </ThemedView>
                )}

                {a.assignment_status === 'Accepted' && a.assigned_by && (
                  <ThemedView style={styles.actions}>
                    <BigButton
                      label="Message organizer"
                      variant="secondary"
                      onPress={() => handleMessageOrganizer(a)}
                      loading={messagingId === a.id}
                      disabled={messagingId !== null}
                    />
                  </ThemedView>
                )}
              </ThemedView>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { paddingHorizontal: Spacing.four, paddingTop: Spacing.two },
  loading: { flex: 1 },
  filterRow: { flexGrow: 0, marginTop: Spacing.three },
  filterRowContent: { paddingHorizontal: Spacing.four, gap: Spacing.two },
  filterChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  list: {
    padding: Spacing.four,
    gap: Spacing.three,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  card: { borderRadius: 16, padding: Spacing.four, gap: Spacing.half },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.two },
  tournamentName: { flex: 1 },
  badge: { borderWidth: 1.5, borderRadius: 999, paddingHorizontal: Spacing.two, paddingVertical: 2 },
  detailLine: { marginTop: Spacing.half },
  notesBox: { borderRadius: 12, padding: Spacing.three, marginTop: Spacing.two },
  actions: { gap: Spacing.two, marginTop: Spacing.three },
});
