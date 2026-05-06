import 'react-native-gesture-handler';
import './global.css';

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from './src/contexts/AuthContext';
import { AppPreferencesProvider, useAppPreferencesContext } from './src/contexts/AppPreferencesContext';
import { RootNavigator } from './src/navigation/RootNavigator';

const queryClient = new QueryClient();

function AppContainer() {
  const { preferences } = useAppPreferencesContext();

  return (
    <View className={`flex-1 ${preferences.darkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
      <StatusBar style={preferences.darkMode ? 'light' : 'dark'} />
      <RootNavigator />
    </View>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <AppPreferencesProvider>
          <AuthProvider>
            <AppContainer />
          </AuthProvider>
        </AppPreferencesProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
