import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'ncaa-has-seen-onboarding';

// null = still checking AsyncStorage, don't decide what to show yet.
export function useHasSeenOnboarding() {
  const [seen, setSeen] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((value) => setSeen(value === 'true'));
  }, []);

  function markSeen() {
    setSeen(true);
    AsyncStorage.setItem(STORAGE_KEY, 'true');
  }

  return { seen, markSeen };
}
