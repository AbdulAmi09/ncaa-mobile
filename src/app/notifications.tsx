import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

type NotificationRow = {
  id: string;
  title: string | null;
  message: string | null;
  notification_type: string | null;
  is_read: boolean | null;
  created_at: string;
};

function iconFor(type: string | null): keyof typeof Ionicons.glyphMap {
  switch ((type ?? '').toLowerCase()) {
    case 'assignment':
      return 'calendar';
    case 'payment':
      return 'cash';
    case 'admin_message':
      return 'megaphone';
    default:
      return 'notifications';
  }
}

function formatWhen(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return date.toLocaleTimeString('en-NG', { hour: 'numeric', minute: '2-digit' });
  return date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
}

export default function NotificationsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user.id;

  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('notifications')
      .select('id, title, message, notification_type, is_read, created_at')
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    setRows((data as NotificationRow[]) ?? []);
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

  async function handlePress(row: NotificationRow) {
    if (!row.is_read) {
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, is_read: true } : r)));
      supabase.from('notifications').update({ is_read: true }).eq('id', row.id);
    }
    const type = (row.notification_type ?? '').toLowerCase();
    if (type === 'assignment') router.push('/assignments');
    else if (type === 'payment') router.push('/payments');
  }

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        {loading ? (
          <ActivityIndicator style={styles.flex} size="large" />
        ) : rows.length === 0 ? (
          <ThemedView style={styles.empty}>
            <Ionicons name="notifications-outline" size={44} color={theme.textSecondary} />
            <ThemedText themeColor="textSecondary" style={styles.emptyText}>
              Nothing here yet.
            </ThemedText>
          </ThemedView>
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            renderItem={({ item }) => (
              <Pressable onPress={() => handlePress(item)}>
                <Card tone={item.is_read ? 'surface' : 'selected'} style={styles.row}>
                  <ThemedView type={item.is_read ? 'backgroundElement' : 'backgroundSelected'} style={styles.iconWrap}>
                    <Ionicons name={iconFor(item.notification_type)} size={18} color={theme.primary} />
                  </ThemedView>
                  <ThemedView type={item.is_read ? 'backgroundElement' : 'backgroundSelected'} style={styles.rowBody}>
                    <ThemedView
                      type={item.is_read ? 'backgroundElement' : 'backgroundSelected'}
                      style={styles.rowTopLine}>
                      <ThemedText type={item.is_read ? 'default' : 'smallBold'} numberOfLines={1} style={styles.title}>
                        {item.title ?? 'Notification'}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {formatWhen(item.created_at)}
                      </ThemedText>
                    </ThemedView>
                    {!!item.message && (
                      <ThemedText themeColor="textSecondary" type="small" numberOfLines={2}>
                        {item.message}
                      </ThemedText>
                    )}
                  </ThemedView>
                  {!item.is_read && <ThemedView style={[styles.dot, { backgroundColor: theme.primary }]} />}
                </Card>
              </Pressable>
            )}
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two, paddingHorizontal: Spacing.five },
  emptyText: { textAlign: 'center' },
  list: {
    padding: Spacing.four,
    gap: Spacing.three,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  iconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1, gap: 2 },
  rowTopLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.two },
  title: { flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
});
