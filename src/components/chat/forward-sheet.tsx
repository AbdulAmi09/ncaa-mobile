import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { type ForwardTargetRoom, fetchMyRoomsForForwarding } from '@/lib/chat';

export function ForwardSheet({
  visible,
  userId,
  excludeRoomId,
  onClose,
  onSelect,
}: {
  visible: boolean;
  userId: string | undefined;
  excludeRoomId: string;
  onClose: () => void;
  onSelect: (roomId: string) => void;
}) {
  const theme = useTheme();
  const [rooms, setRooms] = useState<ForwardTargetRoom[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!visible || !userId) return;
    setLoading(true);
    fetchMyRoomsForForwarding(userId).then((data) => {
      setRooms(data.filter((r) => r.id !== excludeRoomId));
      setLoading(false);
    });
  }, [visible, userId, excludeRoomId]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation()}>
          <SafeAreaView>
            <ThemedView type="backgroundElement" style={styles.sheet}>
              <ThemedText type="heading" style={styles.title}>
                Forward to…
              </ThemedText>

              {loading ? (
                <ActivityIndicator style={styles.spacing} />
              ) : (
                <FlatList
                  data={rooms}
                  keyExtractor={(item) => item.id}
                  style={styles.list}
                  renderItem={({ item }) => (
                    <Pressable onPress={() => onSelect(item.id)} style={styles.row}>
                      <ThemedText type="smallBold">{item.displayName}</ThemedText>
                    </Pressable>
                  )}
                  ListEmptyComponent={
                    <ThemedText themeColor="textSecondary" style={styles.spacing}>
                      No other conversations yet.
                    </ThemedText>
                  }
                />
              )}

              <Pressable onPress={onClose} style={styles.cancelRow}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  Cancel
                </ThemedText>
              </Pressable>
            </ThemedView>
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: Radius.card,
    borderTopRightRadius: Radius.card,
    padding: Spacing.four,
    maxHeight: '70%',
  },
  title: { marginBottom: Spacing.two },
  list: { maxHeight: 320 },
  row: { paddingVertical: Spacing.three, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(128,128,128,0.2)' },
  cancelRow: { paddingVertical: Spacing.three, alignItems: 'center' },
  spacing: { marginTop: Spacing.three },
});
