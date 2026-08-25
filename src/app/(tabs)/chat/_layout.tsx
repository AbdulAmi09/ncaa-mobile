import { Stack } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';

export default function ChatStackLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.text,
        headerTitleStyle: { fontSize: 18, fontWeight: '700' },
        headerShadowVisible: false,
      }}>
      <Stack.Screen name="index" options={{ title: 'Chat' }} />
      <Stack.Screen name="[roomId]" options={{ title: '' }} />
      <Stack.Screen name="new" options={{ title: 'New chat', presentation: 'modal' }} />
    </Stack>
  );
}
