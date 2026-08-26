import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

// Safety-net screen: WebBrowser.openAuthSessionAsync (used by the Pay Now
// flow) normally intercepts the ncaamobile://payments/callback redirect
// and resolves before the OS hands off to the app's own router, so this
// rarely actually renders -- but if the OS does route here directly, land
// somewhere sensible instead of a "screen not found" error.
export default function PaymentCallbackScreen() {
  const router = useRouter();

  useEffect(() => {
    const timeout = setTimeout(() => router.replace('/payments'), 800);
    return () => clearTimeout(timeout);
  }, [router]);

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" />
        <ThemedText themeColor="textSecondary" style={styles.text}>
          Finishing up your payment…
        </ThemedText>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
  text: { marginTop: Spacing.one },
});
