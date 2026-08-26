import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MinTouchTarget, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { REACTION_EMOJIS } from '@/lib/chat';

export function MessageActionsSheet({
  visible,
  onClose,
  onReact,
  onEdit,
  onDelete,
  onReport,
  onBlock,
  canEdit,
  canDelete,
}: {
  visible: boolean;
  onClose: () => void;
  onReact: (emoji: string) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onReport?: () => void;
  onBlock?: () => void;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const theme = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation()}>
          <SafeAreaView>
            <ThemedView type="backgroundElement" style={styles.sheet}>
              <ThemedView style={styles.emojiRow}>
                {REACTION_EMOJIS.map((emoji) => (
                  <Pressable key={emoji} onPress={() => onReact(emoji)} style={styles.emojiButton} hitSlop={4}>
                    <ThemedText style={styles.emojiText}>{emoji}</ThemedText>
                  </Pressable>
                ))}
              </ThemedView>

              {canEdit && onEdit && (
                <Pressable onPress={onEdit} style={styles.actionRow}>
                  <Ionicons name="pencil-outline" size={20} color={theme.text} />
                  <ThemedText style={styles.actionLabel}>Edit message</ThemedText>
                </Pressable>
              )}

              {canDelete && onDelete && (
                <Pressable onPress={onDelete} style={styles.actionRow}>
                  <Ionicons name="trash-outline" size={20} color={theme.danger} />
                  <ThemedText style={[styles.actionLabel, { color: theme.danger }]}>Delete message</ThemedText>
                </Pressable>
              )}

              {onReport && (
                <Pressable onPress={onReport} style={styles.actionRow}>
                  <Ionicons name="flag-outline" size={20} color={theme.text} />
                  <ThemedText style={styles.actionLabel}>Report</ThemedText>
                </Pressable>
              )}

              {onBlock && (
                <Pressable onPress={onBlock} style={styles.actionRow}>
                  <Ionicons name="ban-outline" size={20} color={theme.danger} />
                  <ThemedText style={[styles.actionLabel, { color: theme.danger }]}>Block this person</ThemedText>
                </Pressable>
              )}

              <Pressable onPress={onClose} style={styles.actionRow}>
                <Ionicons name="close-outline" size={20} color={theme.textSecondary} />
                <ThemedText style={styles.actionLabel} themeColor="textSecondary">
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
    gap: Spacing.one,
  },
  emojiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: Spacing.three,
    marginBottom: Spacing.two,
  },
  emojiButton: { width: MinTouchTarget, height: MinTouchTarget, alignItems: 'center', justifyContent: 'center' },
  emojiText: { fontSize: 28 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, minHeight: MinTouchTarget },
  actionLabel: { flex: 1 },
});
