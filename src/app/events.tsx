import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';

import { BigButton } from '@/components/big-button';
import { Card } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { type EventRow, fetchUpcomingEvents } from '@/lib/events';

const EVENTS_WEB_URL = 'https://app.ncaaweb.com.ng/dashboard/events';

const TYPE_LABELS: Record<string, string> = {
  agm: 'AGM',
  training: 'Training',
  tournament: 'Tournament',
  workshop: 'Workshop',
  other: 'Event',
};

function formatDateRange(start: string, end: string | null) {
  const opts: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' };
  const s = new Date(start).toLocaleDateString('en-NG', opts);
  if (!end) return s;
  const e = new Date(end).toLocaleDateString('en-NG', opts);
  return s === e ? s : `${s} – ${e}`;
}

function formatNaira(amount: number | null) {
  if (!amount) return null;
  return `₦${amount.toLocaleString('en-NG')}`;
}

export default function EventsScreen() {
  const theme = useTheme();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorText, setErrorText] = useState('');

  const load = useCallback(async () => {
    const { data, error } = await fetchUpcomingEvents();
    if (error) setErrorText('We could not load events. Pull down to try again.');
    else setErrorText('');
    setEvents((data as EventRow[]) ?? []);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        {loading ? (
          <ActivityIndicator style={styles.flex} size="large" />
        ) : (
          <ScrollView
            contentContainerStyle={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
            {!!errorText && (
              <Card>
                <ThemedText themeColor="danger">{errorText}</ThemedText>
              </Card>
            )}

            {events.length === 0 && !errorText && (
              <Card>
                <ThemedText themeColor="textSecondary">No upcoming events right now.</ThemedText>
              </Card>
            )}

            {events.map((event) => (
              <Card key={event.id} style={styles.cardGap}>
                <ThemedView style={styles.headerRow}>
                  <ThemedText type="heading" style={styles.title}>
                    {event.title}
                  </ThemedText>
                  {!!event.event_type && (
                    <ThemedView type="backgroundSelected" style={styles.typeBadge}>
                      <ThemedText type="small" style={{ color: theme.primary }}>
                        {TYPE_LABELS[event.event_type] ?? event.event_type}
                      </ThemedText>
                    </ThemedView>
                  )}
                </ThemedView>

                <ThemedView style={styles.detailRow}>
                  <Ionicons name="calendar-outline" size={16} color={theme.textSecondary} />
                  <ThemedText themeColor="textSecondary" type="small">
                    {formatDateRange(event.start_date, event.end_date)}
                  </ThemedText>
                </ThemedView>

                {(event.venue || event.city) && (
                  <ThemedView style={styles.detailRow}>
                    <Ionicons name="location-outline" size={16} color={theme.textSecondary} />
                    <ThemedText themeColor="textSecondary" type="small">
                      {[event.venue, event.city, event.state].filter(Boolean).join(', ')}
                    </ThemedText>
                  </ThemedView>
                )}

                {!!event.description && (
                  <ThemedText style={styles.description} numberOfLines={4}>
                    {event.description}
                  </ThemedText>
                )}

                {event.requires_registration && (
                  <ThemedView style={styles.actions}>
                    <BigButton
                      label={formatNaira(event.registration_fee) ? `Register (${formatNaira(event.registration_fee)})` : 'Register'}
                      variant="secondary"
                      onPress={() => WebBrowser.openBrowserAsync(EVENTS_WEB_URL)}
                    />
                  </ThemedView>
                )}
              </Card>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  cardGap: { gap: Spacing.one },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: Spacing.two },
  title: { flex: 1 },
  typeBadge: { borderRadius: 999, paddingHorizontal: Spacing.two, paddingVertical: 4 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  description: { marginTop: Spacing.one },
  actions: { marginTop: Spacing.two },
});
