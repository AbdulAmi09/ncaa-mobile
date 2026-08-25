import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/lib/auth-context';
import { registerForPushNotifications } from '@/lib/push-notifications';
import { ThemeOverrideProvider, useThemeOverride } from '@/lib/theme-override-context';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { session, loading } = useAuth();

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync();
  }, [loading]);

  const userId = session?.user.id;
  useEffect(() => {
    // Keyed on the user id, not the session object -- a token refresh
    // produces a new session reference for the same user every ~hour, and
    // re-registering the (unchanged) push token on every one of those would
    // just be wasted permission checks and RPC calls.
    if (userId) registerForPushNotifications();
  }, [userId]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="notifications"
          options={{ headerShown: true, title: 'Notifications', presentation: 'card' }}
        />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="login" />
      </Stack.Protected>
    </Stack>
  );
}

function NavigationThemeProvider({ children }: { children: React.ReactNode }) {
  const { resolvedScheme } = useThemeOverride();
  return <ThemeProvider value={resolvedScheme === 'dark' ? DarkTheme : DefaultTheme}>{children}</ThemeProvider>;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeOverrideProvider>
        <NavigationThemeProvider>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </NavigationThemeProvider>
      </ThemeOverrideProvider>
    </SafeAreaProvider>
  );
}
