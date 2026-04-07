import React from 'react';
import { Text, View } from 'react-native';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <View className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 p-5">
      <Text className="text-base font-semibold text-ink-900">{title}</Text>
      <Text className="mt-1 text-sm leading-6 text-ink-500">{description}</Text>
      {action ? <View className="mt-4">{action}</View> : null}
    </View>
  );
}
