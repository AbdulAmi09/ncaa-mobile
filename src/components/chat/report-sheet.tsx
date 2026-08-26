import { useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BigButton } from '@/components/big-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { type ReportReason, REPORT_REASONS } from '@/lib/moderation';

export function ReportSheet({
  visible,
  userName,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  userName: string;
  onClose: () => void;
  onSubmit: (reason: ReportReason, details: string, alsoBlock: boolean) => void;
}) {
  const theme = useTheme();
  const [reason, setReason] = useState<ReportReason>('spam');
  const [details, setDetails] = useState('');
  const [alsoBlock, setAlsoBlock] = useState(true);

  function handleSubmit() {
    onSubmit(reason, details, alsoBlock);
    setDetails('');
    setReason('spam');
    setAlsoBlock(true);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation()}>
          <SafeAreaView>
            <ThemedView type="backgroundElement" style={styles.sheet}>
              <ThemedText type="heading">Report {userName}</ThemedText>

              <ThemedView style={styles.reasonList}>
                {REPORT_REASONS.map((r) => {
                  const active = reason === r.id;
                  return (
                    <Pressable
                      key={r.id}
                      onPress={() => setReason(r.id)}
                      style={[
                        styles.reasonRow,
                        { borderColor: active ? theme.primary : theme.border, backgroundColor: active ? theme.backgroundSelected : 'transparent' },
                      ]}>
                      <ThemedText type="smallBold">{r.label}</ThemedText>
                    </Pressable>
                  );
                })}
              </ThemedView>

              <TextInput
                value={details}
                onChangeText={setDetails}
                placeholder="Additional details (optional)"
                placeholderTextColor={theme.textSecondary}
                multiline
                style={[styles.input, { borderColor: theme.border, backgroundColor: theme.background, color: theme.text }]}
              />

              <Pressable onPress={() => setAlsoBlock((v) => !v)} style={styles.checkboxRow}>
                <ThemedView
                  style={[
                    styles.checkbox,
                    { borderColor: theme.border, backgroundColor: alsoBlock ? theme.primary : 'transparent' },
                  ]}
                />
                <ThemedText type="small">Also block this person</ThemedText>
              </Pressable>

              <ThemedView style={styles.actions}>
                <BigButton label="Submit report" variant="danger" onPress={handleSubmit} />
                <BigButton label="Cancel" variant="secondary" onPress={onClose} />
              </ThemedView>
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
    gap: Spacing.three,
  },
  reasonList: { gap: Spacing.two },
  reasonRow: { borderWidth: 1.5, borderRadius: Radius.input, padding: Spacing.three },
  input: { borderWidth: 2, borderRadius: Radius.input, padding: Spacing.three, minHeight: 70, fontSize: 16 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2 },
  actions: { gap: Spacing.two, marginTop: Spacing.one },
});
