import React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

interface PrimaryButtonProps {
  label: string;
  onPress?: () => void;
  icon?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
}

export function PrimaryButton({
  label,
  onPress,
  icon,
  loading = false,
  disabled = false,
  variant = 'primary',
}: PrimaryButtonProps) {
  const isDisabled = disabled || loading;

  const containerClass =
    variant === 'secondary'
      ? 'border border-slate-200 bg-white'
      : variant === 'ghost'
        ? 'bg-slate-100'
        : 'bg-emerald-600 shadow-sm';

  const textClass = variant === 'primary' ? 'text-white' : 'text-slate-800';

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      className={`min-h-[48px] flex-row items-center justify-center rounded-2xl px-4 py-3 ${containerClass} ${isDisabled ? 'opacity-60' : ''}`}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#ffffff' : '#0f172a'} />
      ) : (
        <View className="flex-row items-center gap-2">
          {icon}
          <Text className={`text-sm font-semibold ${textClass}`}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}
