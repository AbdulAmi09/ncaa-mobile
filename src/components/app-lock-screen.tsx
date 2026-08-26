import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BigButton } from '@/components/big-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAppLock } from '@/lib/app-lock-context';

export function AppLockScreen() {
  const theme = useTheme();
  const { attemptUnlock } = useAppLock();

  // Prompt immediately on mount so returning from the background doesn't
  // need an extra tap most of the time.
  useEffect(() => {
    attemptUnlock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.center}>
        <Ionicons name="lock-closed" size={48} color={theme.primary} />
        <ThemedText type="heading" style={styles.title}>
          NCAA Arbiters is locked
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.subtitle}>
          Unlock with your face or fingerprint to continue.
        </ThemedText>
        <ThemedView style={styles.buttonWrap}>
          <BigButton label="Unlock" onPress={attemptUnlock} />
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.five, gap: Spacing.two },
  title: { textAlign: 'center', marginTop: Spacing.two },
  subtitle: { textAlign: 'center' },
  buttonWrap: { width: '100%', marginTop: Spacing.four },
});
