import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

export type ThemeOverride = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'ncaa-theme-override';

type ThemeOverrideContextValue = {
  override: ThemeOverride;
  resolvedScheme: 'light' | 'dark';
  setOverride: (value: ThemeOverride) => void;
};

const ThemeOverrideContext = createContext<ThemeOverrideContextValue>({
  override: 'system',
  resolvedScheme: 'light',
  setOverride: () => {},
});

export function ThemeOverrideProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [override, setOverrideState] = useState<ThemeOverride>('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') setOverrideState(stored);
    });
  }, []);

  function setOverride(value: ThemeOverride) {
    setOverrideState(value);
    AsyncStorage.setItem(STORAGE_KEY, value);
  }

  const resolvedScheme: 'light' | 'dark' =
    override === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : override;

  return (
    <ThemeOverrideContext.Provider value={{ override, resolvedScheme, setOverride }}>
      {children}
    </ThemeOverrideContext.Provider>
  );
}

export function useThemeOverride() {
  return useContext(ThemeOverrideContext);
}
