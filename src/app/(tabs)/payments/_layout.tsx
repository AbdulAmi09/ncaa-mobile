import { Stack } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';

export default function PaymentsStackLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.text,
        headerTitleStyle: { fontSize: 18, fontWeight: '700' },
        headerShadowVisible: false,
      }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[id]" options={{ title: 'Receipt' }} />
      <Stack.Screen name="new" options={{ title: 'Make a payment', presentation: 'modal' }} />
      <Stack.Screen name="callback" options={{ headerShown: false }} />
    </Stack>
  );
}
