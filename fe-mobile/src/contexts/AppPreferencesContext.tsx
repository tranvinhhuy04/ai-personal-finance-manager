import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const APP_PREFERENCES_STORAGE_KEY = 'fintech-mobile-preferences';

type Preferences = {
  darkMode: boolean;
  notifications: boolean;
  biometricLock: boolean;
};

const DEFAULT_PREFERENCES: Preferences = {
  darkMode: false,
  notifications: true,
  biometricLock: false,
};

type AppPreferencesContextValue = {
  preferences: Preferences;
  isLoading: boolean;
  setDarkMode: (value: boolean) => Promise<void>;
  setNotifications: (value: boolean) => Promise<void>;
  setBiometricLock: (value: boolean) => Promise<void>;
};

const AppPreferencesContext = createContext<AppPreferencesContextValue | undefined>(undefined);

export function AppPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const saved = await AsyncStorage.getItem(APP_PREFERENCES_STORAGE_KEY);
        if (!saved || !isMounted) {
          return;
        }

        setPreferences({
          ...DEFAULT_PREFERENCES,
          ...JSON.parse(saved),
        });
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, []);

  const updatePreference = async <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    setPreferences((current) => {
      const next = { ...current, [key]: value };
      void AsyncStorage.setItem(APP_PREFERENCES_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const value = useMemo<AppPreferencesContextValue>(
    () => ({
      preferences,
      isLoading,
      setDarkMode: (darkMode) => updatePreference('darkMode', darkMode),
      setNotifications: (notifications) => updatePreference('notifications', notifications),
      setBiometricLock: (biometricLock) => updatePreference('biometricLock', biometricLock),
    }),
    [isLoading, preferences]
  );

  return <AppPreferencesContext.Provider value={value}>{children}</AppPreferencesContext.Provider>;
}

export function useAppPreferencesContext() {
  const context = useContext(AppPreferencesContext);

  if (!context) {
    throw new Error('useAppPreferencesContext must be used within AppPreferencesProvider');
  }

  return context;
}
