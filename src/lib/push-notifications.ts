import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Registers this device for push and saves the Expo push token against the
// signed-in arbiter via register_device_push_token() (script 069 on the
// nigarbapp DB) -- the same trigger that already emails/web-pushes on every
// notifications insert now also fans out to this token. Safe to call every
// time the app opens with a session: it's an upsert keyed on the token, and
// permission prompts/no-ops are all handled internally.
export async function registerForPushNotifications() {
  // Push notifications require a physical device and a development/
  // production build -- Expo Go dropped remote push support, and
  // simulators/emulators can't get a real token either way.
  if (!Device.isDevice) return;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) return;

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await supabase.rpc('register_device_push_token', {
      p_expo_push_token: token,
      p_platform: Platform.OS,
    });
  } catch {
    // Best-effort: a failure here shouldn't block using the app, it just
    // means this device won't get pushes until the next successful call.
  }
}
