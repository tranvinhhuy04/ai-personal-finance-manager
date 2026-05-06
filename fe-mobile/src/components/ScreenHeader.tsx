import React from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppPreferencesContext } from '../contexts/AppPreferencesContext';

interface ScreenHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
}

export function ScreenHeader({ eyebrow, title, subtitle, rightSlot }: ScreenHeaderProps) {
  const { preferences } = useAppPreferencesContext();

  const gradientColors = preferences.darkMode
    ? (['#111827', '#0f172a', '#020617'] as const)
    : (['#ffffff', '#f0fdf4', '#ecfeff'] as const);

  return (
    <SafeAreaView edges={['top']} className={preferences.darkMode ? 'bg-slate-950' : 'bg-slate-50'}>
      <View className="px-5 pt-3 pb-3">
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className={`overflow-hidden rounded-[30px] px-5 py-5 shadow-sm ${preferences.darkMode ? 'border border-slate-800' : 'border border-white/80'}`}
        >
          <View className={`absolute -right-8 -top-6 h-24 w-24 rounded-full ${preferences.darkMode ? 'bg-emerald-900/30' : 'bg-emerald-100/60'}`} />
          <View className={`absolute bottom-0 left-0 h-16 w-full ${preferences.darkMode ? 'bg-black/10' : 'bg-white/20'}`} />

          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1">
              {eyebrow ? (
                <View className={`self-start rounded-full px-3 py-1 ${preferences.darkMode ? 'border border-emerald-700 bg-emerald-900/40' : 'border border-emerald-200 bg-emerald-50'}`}>
                  <Text className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-700">{eyebrow}</Text>
                </View>
              ) : null}
              <Text className={`mt-3 text-[30px] font-bold tracking-tight ${preferences.darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{title}</Text>
              {subtitle ? <Text className={`mt-2 text-sm leading-6 ${preferences.darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{subtitle}</Text> : null}
            </View>
            {rightSlot ? <View className="pt-1">{rightSlot}</View> : null}
          </View>
        </LinearGradient>
      </View>
    </SafeAreaView>
  );
}
