import React from 'react';
import { Pressable, Text } from 'react-native';

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** 'filter' = rounded-full pill (default); 'tab' = rounded-2xl block */
  variant?: 'filter' | 'tab';
}

/**
 * Shared filter chip / pill — replaces FilterChip & FilterPill duplicates
 * in DashboardScreen, MyWalletsScreen and AnalyticsScreen.
 */
export function Chip({ label, selected, onPress, variant = 'filter' }: ChipProps) {
  const base =
    variant === 'tab'
      ? `min-h-[44px] flex-1 items-center justify-center rounded-2xl px-3 py-2.5`
      : `min-h-[40px] items-center justify-center rounded-full px-4 py-2`;

  const bg = selected
    ? 'bg-emerald-600'
    : 'bg-slate-100';

  const textColor = selected ? 'text-white' : 'text-slate-600';
  const textSize = variant === 'tab' ? 'text-[13px]' : 'text-[13px]';

  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: selected ? '#047857' : '#e2e8f0', borderless: false }}
      style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
      className={`${base} ${bg}`}
    >
      <Text className={`font-semibold ${textSize} ${textColor}`} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}
