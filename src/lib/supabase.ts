import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// This is a native-first app, but expo-router's web target still
// server-renders each route in Node during dev/export. AsyncStorage
// touches `window` on that pass, which doesn't exist there, so no-op the
// storage adapter for that server pass only — never on native or in an
// actual browser.
const isWebServerRender = Platform.OS === 'web' && typeof window === 'undefined';
const storage = isWebServerRender
  ? {
      getItem: async () => null,
      setItem: async () => {},
      removeItem: async () => {},
    }
  : AsyncStorage;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
