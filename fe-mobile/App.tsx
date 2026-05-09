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

// QueryClient dùng chung cho toàn app – cấu hình mặc định (staleTime, retry) đặt tại từng hook.
const queryClient = new QueryClient();

// AppContainer tách ra để có thể đọc AppPreferencesContext (provider phải nằm ngoài).
// Áp dụng dark mode ở cấp root View để màu nền đồng nhất toàn app.
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
  // Thứ tự Provider quan trọng:
  // QueryClientProvider → SafeAreaProvider → AppPreferencesProvider → AuthProvider
  // AuthProvider cần đọc AsyncStorage nên phải nằm trong SafeAreaProvider để tránh lỗi SafeArea
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
