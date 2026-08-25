import { Ionicons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ComingSoonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
};

// Shared placeholder for tabs not built yet in this first pass, so the
// navigation shell is real and clickable end-to-end today.
export function ComingSoon({ icon, title, description }: ComingSoonProps) {
  const theme = useTheme();
  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.center}>
        <Ionicons name={icon} size={48} color={theme.textSecondary} />
        <ThemedText type="heading" style={styles.title}>
          {title}
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.description}>
          {description}
        </ThemedText>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.five,
    gap: Spacing.two,
  },
  title: { marginTop: Spacing.two },
  description: { textAlign: 'center' },
});
