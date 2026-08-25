import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Share, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth-context';
import { type Payment, TYPE_LABELS, fetchPaymentById, formatNaira } from '@/lib/payments';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <ThemedView style={styles.row}>
      <ThemedText themeColor="textSecondary">{label}</ThemedText>
      <ThemedText type="smallBold" style={styles.rowValue}>
        {value}
      </ThemedText>
    </ThemedView>
  );
}

export default function ReceiptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { session } = useAuth();
  const userId = session?.user.id;

  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id || !userId) return;
    fetchPaymentById(id, userId).then(({ data, error }) => {
      if (error || !data || data.payment_status !== 'paid') {
        setNotFound(true);
      } else {
        setPayment(data);
      }
      setLoading(false);
    });
  }, [id, userId]);

  async function handleShare() {
    if (!payment) return;
    await Share.share({
      message: `NCAA Payment Receipt\n${formatNaira(payment.amount, payment.currency)} paid for ${TYPE_LABELS[payment.payment_type] ?? payment.payment_type}${payment.tournament_name ? ` (${payment.tournament_name})` : ''}\nReference: ${payment.transaction_reference ?? 'N/A'}\nDate: ${payment.paid_date ? new Date(payment.paid_date).toLocaleString('en-NG') : 'N/A'}`,
    });
  }

  if (loading) {
    return (
      <ThemedView style={styles.flex}>
        <ActivityIndicator style={styles.flex} size="large" />
      </ThemedView>
    );
  }

  if (notFound || !payment) {
    return (
      <ThemedView style={styles.flex}>
        <SafeAreaView style={styles.center}>
          <ThemedText themeColor="textSecondary">This receipt isn't available.</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <Card style={styles.card}>
            <ThemedView style={styles.successRow}>
              <Ionicons name="checkmark-circle" size={22} color={theme.success} />
              <ThemedText type="smallBold" themeColor="success">
                Payment successful
              </ThemedText>
            </ThemedView>

            <ThemedView style={styles.amountBlock}>
              <ThemedText themeColor="textSecondary" type="small">
                Amount paid
              </ThemedText>
              <ThemedText type="title">{formatNaira(payment.amount, payment.currency)}</ThemedText>
            </ThemedView>

            <ThemedView style={styles.details}>
              <Row label="Paid to" value="Nigeria Chess Arbiters Association" />
              <Row label="Arbiter" value={payment.arbiter_name ?? '—'} />
              <Row label="Payment type" value={TYPE_LABELS[payment.payment_type] ?? payment.payment_type} />
              {!!payment.tournament_name && <Row label="Tournament" value={payment.tournament_name} />}
              {!!payment.description && <Row label="Description" value={payment.description} />}
              <Row label="Payment method" value={payment.payment_method ?? '—'} />
              <Row label="Reference" value={payment.transaction_reference ?? '—'} />
              <Row
                label="Date paid"
                value={payment.paid_date ? new Date(payment.paid_date).toLocaleString('en-NG') : '—'}
              />
            </ThemedView>
          </Card>

          <Pressable
            onPress={handleShare}
            style={[styles.shareButton, { borderColor: theme.border }]}>
            <Ionicons name="share-outline" size={20} color={theme.text} />
            <ThemedText type="smallBold">Share receipt</ThemedText>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.five },
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  card: { gap: Spacing.four },
  successRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, justifyContent: 'center' },
  amountBlock: { alignItems: 'center', gap: Spacing.half, paddingVertical: Spacing.three },
  details: { gap: Spacing.two },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.three },
  rowValue: { flex: 1, textAlign: 'right' },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderWidth: 1.5,
    borderRadius: 14,
    minHeight: 52,
  },
});
