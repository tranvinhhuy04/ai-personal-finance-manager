import React from 'react';
import { Text, View } from 'react-native';
import { useAppPreferencesContext } from '../contexts/AppPreferencesContext';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  const { preferences } = useAppPreferencesContext();

  return (
    <View className={`rounded-[24px] border border-dashed p-5 ${preferences.darkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-slate-50'}`}>
      <Text className={`text-base font-semibold ${preferences.darkMode ? 'text-slate-100' : 'text-ink-900'}`}>{title}</Text>
      <Text className={`mt-1 text-sm leading-6 ${preferences.darkMode ? 'text-slate-400' : 'text-ink-500'}`}>{description}</Text>
      {action ? <View className="mt-4">{action}</View> : null}
    </View>
  );
}
