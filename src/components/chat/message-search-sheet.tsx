import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { type MessageSearchResult, messagePreview, searchMessagesInRoom } from '@/lib/chat';

export function MessageSearchSheet({
  visible,
  roomId,
  onClose,
  onSelect,
}: {
  visible: boolean;
  roomId: string;
  onClose: () => void;
  onSelect: (result: MessageSearchResult) => void;
}) {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MessageSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible) {
      setQuery('');
      setResults([]);
    }
  }, [visible]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const found = await searchMessagesInRoom(roomId, query.trim());
      setResults(found);
      setSearching(false);
    }, 300);
  }, [query, roomId]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ThemedView style={styles.flex}>
        <SafeAreaView style={styles.flex}>
          <ThemedView style={styles.headerRow}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search this conversation"
              placeholderTextColor={theme.textSecondary}
              autoFocus
              style={[styles.input, { borderColor: theme.border, backgroundColor: theme.backgroundElement, color: theme.text }]}
            />
            <Pressable onPress={onClose} hitSlop={8}>
              <ThemedText style={{ color: theme.primary }}>Cancel</ThemedText>
            </Pressable>
          </ThemedView>

          {searching && <ActivityIndicator style={styles.spacing} />}

          {!searching && query.trim() !== '' && results.length === 0 && (
            <ThemedText themeColor="textSecondary" style={[styles.spacing, styles.centerText]}>
              No messages match "{query}".
            </ThemedText>
          )}

          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <Pressable onPress={() => onSelect(item)}>
                <ThemedView type="backgroundElement" style={styles.resultRow}>
                  <Ionicons name="chatbubble-outline" size={18} color={theme.textSecondary} />
                  <ThemedView style={styles.resultBody}>
                    <ThemedText numberOfLines={2}>{messagePreview({ ...item, is_deleted: false })}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {new Date(item.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </ThemedText>
                  </ThemedView>
                </ThemedView>
              </Pressable>
            )}
          />
        </SafeAreaView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.four },
  input: { flex: 1, borderWidth: 2, borderRadius: Radius.input, paddingHorizontal: Spacing.three, minHeight: 52, fontSize: 18 },
  spacing: { marginTop: Spacing.three },
  centerText: { textAlign: 'center', paddingHorizontal: Spacing.five },
  list: { paddingHorizontal: Spacing.four, gap: Spacing.two },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, borderRadius: Radius.card, padding: Spacing.three },
  resultBody: { flex: 1, gap: 2 },
});
