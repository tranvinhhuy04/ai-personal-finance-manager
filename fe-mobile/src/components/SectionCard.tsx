import React from 'react';
import { Text, View } from 'react-native';
import { useAppPreferencesContext } from '../contexts/AppPreferencesContext';

interface SectionCardProps {
  title?: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function SectionCard({ title, subtitle, rightSlot, children, className = '' }: SectionCardProps) {
  const { preferences } = useAppPreferencesContext();

  return (
    <View className={`mb-5 rounded-[20px] px-4 py-4 shadow-sm ${preferences.darkMode ? 'border border-slate-800/70 bg-slate-900 shadow-black/20' : 'border border-slate-200/60 bg-white shadow-slate-100/60'} ${className}`}>
      {title ? (
        <View className="mb-4 flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <Text className={`text-lg font-bold tracking-tight ${preferences.darkMode ? 'text-slate-100' : 'text-slate-800'}`}>{title}</Text>
            {subtitle ? <Text className={`mt-1 text-sm leading-6 ${preferences.darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{subtitle}</Text> : null}
          </View>
          {rightSlot}
        </View>
      ) : null}

      {children}
    </View>
  );
}
