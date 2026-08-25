import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { type ColorValue, View } from 'react-native';

import { CardShadow } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type IconName = keyof typeof Ionicons.glyphMap;

function TabIcon({
  name,
  nameActive,
  focused,
  color,
}: {
  name: IconName;
  nameActive: IconName;
  focused: boolean;
  color: ColorValue;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        width: 44,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: focused ? theme.backgroundSelected : 'transparent',
      }}>
      <Ionicons name={focused ? nameActive : name} size={22} color={color} />
    </View>
  );
}

// Plain expo-router Tabs, not the newer native-tabs API: every tab always
// shows an icon AND a text label (never icon-only), and the bar stays
// visually identical on iOS and Android so there's one thing to learn.
// Outline icons when inactive, filled when active, with a soft pill behind
// the active icon -- small touches so the bar doesn't read as flat/plain.
export default function TabsLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.background,
          borderTopWidth: 0,
          height: 78,
          paddingBottom: 14,
          paddingTop: 8,
          ...CardShadow,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '700', marginTop: 2 },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="home-outline" nameActive="home" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="assignments"
        options={{
          title: 'Assignments',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="calendar-outline" nameActive="calendar" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="payments"
        options={{
          title: 'Payments',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="cash-outline" nameActive="cash" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="chatbubbles-outline" nameActive="chatbubbles" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="person-outline" nameActive="person" focused={focused} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
