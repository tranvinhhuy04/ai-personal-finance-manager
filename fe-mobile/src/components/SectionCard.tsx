import React from 'react';
import { Text, View } from 'react-native';

interface SectionCardProps {
  title?: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function SectionCard({ title, subtitle, rightSlot, children, className = '' }: SectionCardProps) {
  return (
    <View className={`mb-5 rounded-[24px] border border-slate-200/70 bg-white p-5 shadow-sm ${className}`}>
      {title ? (
        <View className="mb-4 flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <Text className="text-lg font-bold text-slate-800">{title}</Text>
            {subtitle ? <Text className="mt-1 text-sm leading-5 text-slate-500">{subtitle}</Text> : null}
          </View>
          {rightSlot}
        </View>
      ) : null}

      {children}
    </View>
  );
}
