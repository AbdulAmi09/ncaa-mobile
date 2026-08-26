import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Global, not per-screen: a lost connection currently just makes each
// screen's own fetch fail with a generic "couldn't load" message, with no
// way to tell "your data is wrong" apart from "you have no signal". This
// sits above the whole app and states the actual cause plainly.
export function OfflineBanner() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      // isInternetReachable can be null while NetInfo is still figuring it
      // out -- only show the banner once we're confident, not on every
      // brief null flicker.
      const offline = state.isConnected === false || state.isInternetReachable === false;
      setIsOffline(offline);
    });
    return () => unsubscribe();
  }, []);

  if (!isOffline) return null;

  return (
    <ThemedView style={[styles.banner, { backgroundColor: theme.danger, paddingTop: insets.top + Spacing.one }]}>
      <ThemedText type="small" style={styles.text}>
        No internet connection
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    paddingBottom: Spacing.one,
    alignItems: 'center',
  },
  text: { color: '#fff', fontWeight: '700' },
});
