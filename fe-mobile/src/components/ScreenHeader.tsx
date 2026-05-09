import React from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppPreferencesContext } from '../contexts/AppPreferencesContext';

interface ScreenHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
}

export function ScreenHeader({ eyebrow, title, subtitle, rightSlot }: ScreenHeaderProps) {
  const { preferences } = useAppPreferencesContext();
  const isDark = preferences.darkMode;

  return (
    <SafeAreaView edges={['top']} className={isDark ? 'bg-slate-950' : 'bg-slate-50'}>
      <View className={`px-5 pb-4 pt-3 ${isDark ? 'border-b border-slate-800/60' : 'border-b border-slate-100'}`}>
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            {eyebrow ? (
              <View className={`mb-2.5 self-start rounded-full px-3 py-1 ${isDark ? 'bg-emerald-900/50' : 'bg-emerald-50'}`}>
                <Text className="text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-600">
                  {eyebrow}
                </Text>
              </View>
            ) : null}
            <Text
              className={`text-[26px] font-extrabold tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}
            >
              {title}
            </Text>
            {subtitle ? (
              <Text className={`mt-1.5 text-[13px] leading-5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          {rightSlot ? <View className="pt-1">{rightSlot}</View> : null}
        </View>
      </View>
    </SafeAreaView>
  );
}
