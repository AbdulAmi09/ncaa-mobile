import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppLockScreen } from '@/components/app-lock-screen';
import { OnboardingCarousel } from '@/components/onboarding-carousel';
import { AppLockProvider, useAppLock } from '@/lib/app-lock-context';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { useHasSeenOnboarding } from '@/lib/onboarding';
import { registerForPushNotifications } from '@/lib/push-notifications';
import { Sentry } from '@/lib/sentry';
import { ThemeOverrideProvider, useThemeOverride } from '@/lib/theme-override-context';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { session, loading } = useAuth();
  const { enabled: lockEnabled, unlocked } = useAppLock();
  const { seen: hasSeenOnboarding, markSeen: markOnboardingSeen } = useHasSeenOnboarding();

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

  useEffect(() => {
    // Attaches the arbiter's id to any crash/error report so an issue in
    // Sentry can be traced back to who hit it -- id only, no PII, matching
    // sendDefaultPii: false in lib/sentry.ts.
    Sentry.setUser(userId ? { id: userId } : null);
  }, [userId]);

  if (loading || hasSeenOnboarding === null) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // First launch only, and only before signing in -- someone who's already
  // signed in has obviously used the app before, no need to explain it.
  if (!session && !hasSeenOnboarding) {
    return <OnboardingCarousel onDone={markOnboardingSeen} />;
  }

  // Only gates screens behind the signed-in guard below -- there's nothing
  // worth locking on the login screen itself.
  if (session && lockEnabled && !unlocked) {
    return <AppLockScreen />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="notifications"
          options={{ headerShown: true, title: 'Notifications', presentation: 'card' }}
        />
        <Stack.Screen name="events" options={{ headerShown: true, title: 'Events' }} />
        <Stack.Screen name="directory" options={{ headerShown: true, title: 'Arbiter directory' }} />
        <Stack.Screen name="resources" options={{ headerShown: true, title: 'Resources' }} />
        <Stack.Screen name="dashboard/index" />
        <Stack.Screen name="dashboard/[...path]" />
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

function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeOverrideProvider>
        <NavigationThemeProvider>
          <AuthProvider>
            <AppLockProvider>
              <RootNavigator />
            </AppLockProvider>
          </AuthProvider>
        </NavigationThemeProvider>
      </ThemeOverrideProvider>
    </SafeAreaProvider>
  );
}

// Sentry.wrap adds automatic navigation tracing and wraps the tree in its
// own error boundary, on top of the global JS/native crash handlers
// Sentry.init already installed in lib/sentry.ts.
export default Sentry.wrap(RootLayout);
