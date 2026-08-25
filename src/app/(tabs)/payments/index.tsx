import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';

import { BigButton } from '@/components/big-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import type { ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth-context';
import {
  type Payment,
  type PaymentDue,
  TYPE_LABELS,
  fetchPaymentDues,
  fetchPaymentStats,
  fetchPaymentsPage,
  formatNaira,
} from '@/lib/payments';

const PAYMENTS_WEB_URL = 'https://app.ncaaweb.com.ng/dashboard/payments';

type Filter = 'all' | 'paid' | 'pending' | 'overdue';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'paid', label: 'Paid' },
  { key: 'pending', label: 'Pending' },
  { key: 'overdue', label: 'Overdue' },
];

function statusColor(status: string): ThemeColor {
  switch (status) {
    case 'paid':
      return 'success';
    case 'pending':
    case 'processing':
      return 'warning';
    case 'overdue':
      return 'danger';
    default:
      return 'textSecondary';
  }
}

function formatDate(dateString: string | null) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function PaymentsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user.id;

  const [payments, setPayments] = useState<Payment[]>([]);
  const [dues, setDues] = useState<PaymentDue[]>([]);
  const [statsRows, setStatsRows] = useState<{ amount: number; payment_status: string; created_at: string }[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorText, setErrorText] = useState('');

  const load = useCallback(async () => {
    if (!userId) return;
    const [listRes, statsRes, duesRes] = await Promise.all([
      fetchPaymentsPage(userId),
      fetchPaymentStats(userId),
      fetchPaymentDues(userId),
    ]);
    if (listRes.error || statsRes.error || duesRes.error) {
      setErrorText('We could not load your payments. Pull down to try again.');
    } else {
      setErrorText('');
    }
    setPayments(listRes.data);
    setHasMore(listRes.hasMore);
    setStatsRows((statsRes.data as any[]) ?? []);
    setDues((duesRes.data as PaymentDue[]) ?? []);
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

  async function loadMore() {
    if (!userId || payments.length === 0) return;
    setLoadingMore(true);
    const oldest = payments[payments.length - 1].created_at;
    const { data, hasMore: more } = await fetchPaymentsPage(userId, oldest);
    setPayments((prev) => [...prev, ...data]);
    setHasMore(more);
    setLoadingMore(false);
  }

  function payOnWebsite() {
    WebBrowser.openBrowserAsync(PAYMENTS_WEB_URL);
  }

  const { totalPaid, totalPending, totalOverdue, thisYearTotal } = useMemo(() => {
    const currentYear = new Date().getFullYear();
    let paid = 0;
    let pending = 0;
    let overdue = 0;
    let thisYear = 0;
    for (const row of statsRows) {
      const amount = Number(row.amount) || 0;
      if (row.payment_status === 'paid') paid += amount;
      if (row.payment_status === 'pending' || row.payment_status === 'processing') pending += amount;
      if (row.payment_status === 'overdue') overdue += amount;
      if (new Date(row.created_at).getFullYear() === currentYear) thisYear += amount;
    }
    return { totalPaid: paid, totalPending: pending, totalOverdue: overdue, thisYearTotal: thisYear };
  }, [statsRows]);

  const visible = filter === 'all' ? payments : payments.filter((p) => p.payment_status === filter);

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <ThemedView style={styles.headerRow}>
          <ThemedText type="title">Payments</ThemedText>
        </ThemedView>

        {loading ? (
          <ActivityIndicator style={styles.flex} size="large" />
        ) : (
          <ScrollView
            contentContainerStyle={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
            {!!errorText && (
              <ThemedView type="backgroundElement" style={styles.card}>
                <ThemedText themeColor="danger">{errorText}</ThemedText>
              </ThemedView>
            )}

            {dues.length > 0 && (
              <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.warning, borderWidth: 1.5 }]}>
                <ThemedText type="heading">What you owe</ThemedText>
                {dues.map((due) => (
                  <ThemedView key={due.id} style={styles.dueRow}>
                    <ThemedView style={styles.dueInfo}>
                      <ThemedText type="smallBold">{TYPE_LABELS[due.payment_type] ?? due.payment_type}</ThemedText>
                      <ThemedText themeColor="textSecondary" type="small">
                        {formatNaira(due.amount)}
                        {due.due_date ? ` · due ${formatDate(due.due_date)}` : ''}
                      </ThemedText>
                    </ThemedView>
                  </ThemedView>
                ))}
                <BigButton label="Pay on the NCAA website" onPress={payOnWebsite} />
              </ThemedView>
            )}

            <ThemedView style={styles.summaryGrid}>
              <SummaryTile label="Total paid" value={formatNaira(totalPaid)} color="success" />
              <SummaryTile label="Pending" value={formatNaira(totalPending)} color="warning" />
              <SummaryTile label="Overdue" value={formatNaira(totalOverdue)} color="danger" />
              <SummaryTile label="This year" value={formatNaira(thisYearTotal)} color="text" />
            </ThemedView>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
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
                    <ThemedText type="smallBold" style={{ color: active ? theme.primaryText : theme.text }}>
                      {f.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>

            {visible.length === 0 && !errorText && (
              <ThemedView type="backgroundElement" style={styles.card}>
                <ThemedText themeColor="textSecondary">No payment records here.</ThemedText>
              </ThemedView>
            )}

            {visible.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => p.payment_status === 'paid' && router.push(`/payments/${p.id}`)}
                style={({ pressed }) => [
                  styles.card,
                  { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.8 : 1 },
                ]}>
                <ThemedView style={styles.cardHeaderRow}>
                  <ThemedText type="heading" style={styles.paymentTitle}>
                    {p.tournament_name || p.description || TYPE_LABELS[p.payment_type] || 'Payment'}
                  </ThemedText>
                  <ThemedView type="background" style={[styles.badge, { borderColor: theme[statusColor(p.payment_status)] }]}>
                    <ThemedText type="small" themeColor={statusColor(p.payment_status)}>
                      {p.payment_status}
                    </ThemedText>
                  </ThemedView>
                </ThemedView>
                <ThemedText style={styles.amount}>{formatNaira(p.amount, p.currency)}</ThemedText>
                <ThemedText themeColor="textSecondary" type="small">
                  {TYPE_LABELS[p.payment_type] ?? p.payment_type} · Due {formatDate(p.due_date)}
                </ThemedText>
                {p.payment_status === 'paid' && (
                  <ThemedText type="small" style={{ color: theme.primary, marginTop: Spacing.half }}>
                    View receipt →
                  </ThemedText>
                )}
              </Pressable>
            ))}

            {hasMore && (
              <BigButton
                label={loadingMore ? 'Loading…' : 'Load older payments'}
                variant="secondary"
                onPress={loadMore}
                loading={loadingMore}
              />
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

function SummaryTile({ label, value, color }: { label: string; value: string; color: ThemeColor }) {
  const theme = useTheme();
  return (
    <ThemedView type="backgroundElement" style={styles.summaryTile}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="heading" style={{ color: theme[color], marginTop: 2 }}>
        {value}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerRow: { paddingHorizontal: Spacing.four, paddingTop: Spacing.two },
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  card: { borderRadius: 16, padding: Spacing.four, gap: Spacing.two },
  dueRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dueInfo: { gap: 2 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  summaryTile: { flexBasis: '47%', flexGrow: 1, borderRadius: 16, padding: Spacing.three },
  filterRow: { gap: Spacing.two, paddingVertical: Spacing.half },
  filterChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: Spacing.two },
  paymentTitle: { flex: 1 },
  badge: { borderWidth: 1.5, borderRadius: 999, paddingHorizontal: Spacing.two, paddingVertical: 2 },
  amount: { fontSize: 22, fontWeight: '700' },
});
