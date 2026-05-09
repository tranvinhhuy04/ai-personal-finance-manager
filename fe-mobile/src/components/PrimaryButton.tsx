import React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

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
        : 'shadow-sm';

  const textClass = variant === 'primary' ? 'text-white' : 'text-slate-800';

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      android_ripple={{ color: variant === 'primary' ? '#047857' : '#e2e8f0', borderless: false }}
      style={({ pressed }) => ({ opacity: pressed ? 0.78 : isDisabled ? 0.55 : 1 })}
      className={`min-h-[52px] overflow-hidden rounded-[14px]`}
    >
      {variant === 'primary' ? (
        <LinearGradient
          colors={['#059669', '#0f766e', '#115e59']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className={`min-h-[52px] flex-row items-center justify-center px-5 py-3 ${containerClass}`}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <View className="max-w-full flex-row items-center justify-center gap-2 px-1">
              {icon ? <View className="shrink-0">{icon}</View> : null}
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
                className={`max-w-full flex-shrink text-center text-sm font-semibold ${textClass}`}
              >
                {label}
              </Text>
            </View>
          )}
        </LinearGradient>
      ) : (
        <View className={`min-h-[52px] flex-row items-center justify-center px-5 py-3 ${containerClass}`}>
          {loading ? (
            <ActivityIndicator color="#0f172a" />
          ) : (
            <View className="max-w-full flex-row items-center justify-center gap-2 px-1">
              {icon ? <View className="shrink-0">{icon}</View> : null}
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
                className={`max-w-full flex-shrink text-center text-sm font-semibold ${textClass}`}
              >
                {label}
              </Text>
            </View>
          )}
        </View>
      )}
    </Pressable>
  );
}
