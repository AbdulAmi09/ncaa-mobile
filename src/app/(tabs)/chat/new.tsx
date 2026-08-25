import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth-context';
import { getOrCreateDmRoom, searchUsersForDm } from '@/lib/chat';

type SearchUser = {
  id: string;
  name: string;
  email: string | null;
  avatar_url: string | null;
  arbiter_category: string | null;
};

export default function NewChatScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user.id;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const { data } = await searchUsersForDm(query.trim());
      setResults((data as SearchUser[]) ?? []);
      setSearching(false);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  async function openChatWith(otherUserId: string) {
    if (!userId) return;
    setOpeningId(otherUserId);
    const { data: roomId, error } = await getOrCreateDmRoom(userId, otherUserId);
    setOpeningId(null);
    if (error || !roomId) return;
    router.replace(`/chat/${roomId}`);
  }

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <ThemedView style={styles.searchWrap}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search by name"
            placeholderTextColor={theme.textSecondary}
            autoFocus
            style={[styles.input, { borderColor: theme.border, color: theme.text }]}
          />
        </ThemedView>

        {searching && <ActivityIndicator style={styles.spacing} />}

        {!searching && query.trim() !== '' && results.length === 0 && (
          <ThemedText themeColor="textSecondary" style={[styles.spacing, styles.centerText]}>
            No one found with that name.
          </ThemedText>
        )}

        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => openChatWith(item.id)}
              disabled={openingId !== null}
              style={({ pressed }) => [styles.row, { opacity: pressed || openingId === item.id ? 0.6 : 1 }]}>
              <ThemedView type="backgroundElement" style={styles.avatar}>
                <ThemedText type="smallBold">{item.name.trim().charAt(0).toUpperCase() || '?'}</ThemedText>
              </ThemedView>
              <ThemedView style={styles.rowBody}>
                <ThemedText type="smallBold">{item.name}</ThemedText>
                {!!item.arbiter_category && (
                  <ThemedText type="small" themeColor="textSecondary">
                    {item.arbiter_category}
                  </ThemedText>
                )}
              </ThemedView>
              {openingId === item.id && <ActivityIndicator />}
            </Pressable>
          )}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  searchWrap: { padding: Spacing.four },
  input: { borderWidth: 2, borderRadius: 14, paddingHorizontal: Spacing.three, minHeight: 52, fontSize: 18 },
  spacing: { marginTop: Spacing.three },
  centerText: { textAlign: 'center' },
  list: { paddingHorizontal: Spacing.four, gap: Spacing.three },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.two },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1, gap: 2 },
});
