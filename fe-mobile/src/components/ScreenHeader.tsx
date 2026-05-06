import React from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ScreenHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
}

export function ScreenHeader({ eyebrow, title, subtitle, rightSlot }: ScreenHeaderProps) {
  return (
    <SafeAreaView edges={['top']} className="bg-slate-50">
      <View className="px-5 pt-3 pb-2">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            {eyebrow ? <Text className="text-[11px] font-semibold uppercase tracking-[0.3em] text-emerald-700">{eyebrow}</Text> : null}
            <Text className="mt-2 text-[28px] font-bold tracking-tight text-slate-900">{title}</Text>
            {subtitle ? <Text className="mt-1 text-sm leading-5 text-slate-500">{subtitle}</Text> : null}
          </View>
          {rightSlot ? <View className="pt-1">{rightSlot}</View> : null}
        </View>
      </View>
    </SafeAreaView>
  );
}
