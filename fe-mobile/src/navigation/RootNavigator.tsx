import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BarChart3, Bot, CreditCard, LayoutGrid, ReceiptText, Settings } from 'lucide-react-native';

import { useAppPreferencesContext } from '../contexts/AppPreferencesContext';
import { useAuth } from '../contexts/AuthContext';
import { AIAssistantScreen } from '../screens/AIAssistantScreen';
import { AnalyticsScreen } from '../screens/AnalyticsScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { MyWalletsScreen } from '../screens/MyWalletsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { TransactionScreen } from '../screens/TransactionScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabs() {
  const { preferences } = useAppPreferencesContext();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#059669',
        tabBarInactiveTintColor: preferences.darkMode ? '#94a3b8' : '#64748b',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        tabBarStyle: {
          height: 76,
          paddingTop: 10,
          paddingBottom: 12,
          backgroundColor: preferences.darkMode ? '#0f172a' : '#ffffff',
          borderTopColor: preferences.darkMode ? '#1e293b' : '#e2e8f0',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          shadowColor: '#0f172a',
          shadowOffset: { width: 0, height: -8 },
          shadowOpacity: 0.08,
          shadowRadius: 16,
          elevation: 18,
        },
        tabBarItemStyle: {
          paddingVertical: 2,
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'Trang chủ',
          tabBarIcon: ({ color, size }) => <LayoutGrid color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="MyWallets"
        component={MyWalletsScreen}
        options={{
          title: 'Ví',
          tabBarIcon: ({ color, size }) => <CreditCard color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Transactions"
        component={TransactionScreen}
        options={{
          title: 'Giao dịch',
          tabBarIcon: ({ color, size }) => <ReceiptText color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{
          title: 'Phân tích',
          tabBarIcon: ({ color, size }) => <BarChart3 color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="AI"
        component={AIAssistantScreen}
        options={{
          title: 'AI',
          tabBarIcon: ({ color, size }) => <Bot color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Cài đặt',
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}

function BootstrapScreen() {
  const { preferences } = useAppPreferencesContext();

  return (
    <View className={`flex-1 items-center justify-center px-6 ${preferences.darkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
      <ActivityIndicator color="#059669" />
      <Text className={`mt-3 text-sm ${preferences.darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Đang khôi phục phiên đăng nhập...</Text>
    </View>
  );
}

export function RootNavigator() {
  const { isAuthenticated, isBootstrapping } = useAuth();
  const { preferences } = useAppPreferencesContext();

  const theme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: preferences.darkMode ? '#020617' : '#f8fafc',
      card: preferences.darkMode ? '#0f172a' : '#ffffff',
      primary: '#059669',
      border: preferences.darkMode ? '#1e293b' : '#e2e8f0',
      text: preferences.darkMode ? '#e2e8f0' : '#0f172a',
    },
  };

  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isBootstrapping ? (
          <Stack.Screen name="Bootstrap" component={BootstrapScreen} />
        ) : isAuthenticated ? (
          <Stack.Screen name="MainTabs" component={MainTabs} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
