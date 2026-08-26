import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getOrCreateDmRoom } from '@/lib/chat';
import { type DirectoryMember, type Zone, fetchZoneDirectory, fetchZones } from '@/lib/directory';
import { useAuth } from '@/lib/auth-context';

function initials(first: string | null, last: string | null) {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase() || '?';
}

export default function DirectoryScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user.id;

  const [zones, setZones] = useState<Zone[]>([]);
  const [members, setMembers] = useState<DirectoryMember[]>([]);
  const [zoneFilter, setZoneFilter] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [messagingId, setMessagingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [zonesRes, membersRes] = await Promise.all([fetchZones(), fetchZoneDirectory()]);
    setZones((zonesRes.data as Zone[]) ?? []);
    setMembers((membersRes.data as DirectoryMember[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter((m) => {
      if (zoneFilter !== 'all' && m.zone !== zoneFilter) return false;
      if (!q) return true;
      const name = `${m.first_name ?? ''} ${m.last_name ?? ''}`.toLowerCase();
      return name.includes(q);
    });
  }, [members, zoneFilter, query]);

  async function handleMessage(member: DirectoryMember) {
    if (!userId || member.id === userId) return;
    setMessagingId(member.id);
    const { data: roomId, error } = await getOrCreateDmRoom(userId, member.id);
    setMessagingId(null);
    if (!error && roomId) router.push(`/chat/${roomId}`);
  }

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <ThemedView style={styles.searchWrap}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search by name"
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { borderColor: theme.border, backgroundColor: theme.backgroundElement, color: theme.text }]}
          />
        </ThemedView>

        {loading ? (
          <ActivityIndicator style={styles.flex} size="large" />
        ) : (
          <>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={[{ id: 'all', name: 'All zones', description: null }, ...zones]}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.filterRow}
              renderItem={({ item }) => {
                const active = zoneFilter === (item.id === 'all' ? 'all' : item.name);
                return (
                  <Pressable
                    onPress={() => setZoneFilter(item.id === 'all' ? 'all' : item.name)}
                    style={[
                      styles.filterChip,
                      { borderColor: theme.border, backgroundColor: active ? theme.primary : theme.backgroundElement },
                    ]}>
                    <ThemedText type="smallBold" style={{ color: active ? theme.primaryText : theme.text }}>
                      {item.name}
                    </ThemedText>
                  </Pressable>
                );
              }}
            />

            <FlatList
              data={visible}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => handleMessage(item)}
                  disabled={item.id === userId || messagingId !== null}
                  style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}>
                  <ThemedView type="backgroundElement" style={styles.avatar}>
                    {item.avatar_url ? (
                      <Image source={{ uri: item.avatar_url }} style={styles.avatarImage} />
                    ) : (
                      <ThemedText type="smallBold">{initials(item.first_name, item.last_name)}</ThemedText>
                    )}
                  </ThemedView>
                  <ThemedView style={styles.rowBody}>
                    <ThemedText type="smallBold">
                      {`${item.first_name ?? ''} ${item.last_name ?? ''}`.trim() || 'Arbiter'}
                      {item.id === userId ? ' (You)' : ''}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {[item.arbiter_level, item.zone].filter(Boolean).join(' · ') || 'NCAA Arbiter'}
                    </ThemedText>
                  </ThemedView>
                  {messagingId === item.id ? (
                    <ActivityIndicator size="small" />
                  ) : item.id !== userId ? (
                    <ThemedText type="small" style={{ color: theme.primary }}>
                      Message
                    </ThemedText>
                  ) : null}
                </Pressable>
              )}
              ListEmptyComponent={
                <ThemedView style={styles.empty}>
                  <ThemedText themeColor="textSecondary">No arbiters match this search.</ThemedText>
                </ThemedView>
              }
            />
          </>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  searchWrap: { padding: Spacing.four, paddingBottom: Spacing.two },
  input: { borderWidth: 2, borderRadius: Radius.input, paddingHorizontal: Spacing.three, minHeight: 52, fontSize: 18 },
  filterRow: { gap: Spacing.two, paddingHorizontal: Spacing.four, paddingBottom: Spacing.two },
  filterChip: { borderWidth: 1, borderRadius: Radius.pill, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  list: {
    padding: Spacing.four,
    gap: Spacing.three,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  rowBody: { flex: 1, gap: 2 },
  empty: { paddingTop: Spacing.six, alignItems: 'center' },
});
