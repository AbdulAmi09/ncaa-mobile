import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

const STORAGE_KEY = 'ncaa-app-lock-enabled';

type AppLockContextValue = {
  hardwareAvailable: boolean;
  enabled: boolean;
  setEnabled: (value: boolean) => Promise<{ error: string | null }>;
  unlocked: boolean;
  attemptUnlock: () => Promise<boolean>;
};

const AppLockContext = createContext<AppLockContextValue>({
  hardwareAvailable: false,
  enabled: false,
  setEnabled: async () => ({ error: null }),
  unlocked: true,
  attemptUnlock: async () => true,
});

export function AppLockProvider({ children }: { children: React.ReactNode }) {
  const [hardwareAvailable, setHardwareAvailable] = useState(false);
  const [enabled, setEnabledState] = useState(false);
  const [unlocked, setUnlocked] = useState(true);
  const loadedEnabled = useRef(false);

  useEffect(() => {
    (async () => {
      const [hasHardware, isEnrolled, stored] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
        AsyncStorage.getItem(STORAGE_KEY),
      ]);
      const available = hasHardware && isEnrolled;
      setHardwareAvailable(available);
      const wantsLock = available && stored === 'true';
      setEnabledState(wantsLock);
      setUnlocked(!wantsLock);
      loadedEnabled.current = true;
    })();
  }, []);

  // Re-lock whenever the app is backgrounded, not just on cold start --
  // otherwise "enable app lock" would only ever protect against someone
  // force-quitting your phone, which is not the realistic threat model.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (!loadedEnabled.current) return;
      if (state !== 'active') {
        setEnabledState((currentEnabled) => {
          if (currentEnabled) setUnlocked(false);
          return currentEnabled;
        });
      }
    });
    return () => sub.remove();
  }, []);

  async function setEnabled(value: boolean) {
    if (value) {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Confirm to turn on app lock',
      });
      if (!result.success) return { error: 'Could not confirm your identity. App lock was not turned on.' };
    }
    setEnabledState(value);
    setUnlocked(!value);
    await AsyncStorage.setItem(STORAGE_KEY, value ? 'true' : 'false');
    return { error: null };
  }

  async function attemptUnlock() {
    const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Unlock NCAA Arbiters' });
    if (result.success) setUnlocked(true);
    return result.success;
  }

  return (
    <AppLockContext.Provider value={{ hardwareAvailable, enabled, setEnabled, unlocked, attemptUnlock }}>
      {children}
    </AppLockContext.Provider>
  );
}

export function useAppLock() {
  return useContext(AppLockContext);
}
