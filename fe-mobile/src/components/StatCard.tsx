import React from 'react';
import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface StatCardProps {
  title: string;
  value: string;
  hint: string;
  icon?: React.ReactNode;
  primary?: boolean;
}

export function StatCard({ title, value, hint, icon, primary = false }: StatCardProps) {
  if (primary) {
    return (
      <LinearGradient
        colors={['#047857', '#065f46', '#134e4a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="mb-3 rounded-[24px] p-4"
      >
        <View className="mb-5 flex-row items-center justify-between">
          <View className="rounded-2xl bg-white/15 p-3">{icon}</View>
          <Text className="text-xs font-semibold uppercase tracking-wider text-white/80">Live</Text>
        </View>
        <Text className="text-sm font-medium text-white/80">{title}</Text>
        <Text className="mt-2 text-2xl font-bold text-white">{value}</Text>
        <Text className="mt-1 text-sm text-white/75">{hint}</Text>
      </LinearGradient>
    );
  }

  return (
    <View className="mb-3 rounded-[24px] bg-slate-50 p-4">
      <View className="mb-4 rounded-2xl bg-white p-3 self-start">{icon}</View>
      <Text className="text-sm font-medium text-ink-600">{title}</Text>
      <Text className="mt-2 text-xl font-bold text-ink-900">{value}</Text>
      <Text className="mt-1 text-sm text-ink-500">{hint}</Text>
    </View>
  );
}
