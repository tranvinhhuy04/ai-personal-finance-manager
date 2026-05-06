import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'fintech-mobile-preferences';

type Preferences = {
  darkMode: boolean;
  notifications: boolean;
  biometricLock: boolean;
};

const DEFAULTS: Preferences = {
  darkMode: false,
  notifications: true,
  biometricLock: false,
};

export function useAppPreferences() {
  const [preferences, setPreferences] = useState<Preferences>(DEFAULTS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved && isMounted) {
          setPreferences({ ...DEFAULTS, ...JSON.parse(saved) });
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, []);

  const updatePreference = async <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    const next = { ...preferences, [key]: value };
    setPreferences(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  return {
    preferences,
    isLoading,
    setDarkMode: (value: boolean) => updatePreference('darkMode', value),
    setNotifications: (value: boolean) => updatePreference('notifications', value),
    setBiometricLock: (value: boolean) => updatePreference('biometricLock', value),
  };
}
