import React from 'react';
import { ScrollView, Text, View } from 'react-native';

type PlaceholderScreenProps = {
  route?: {
    params?: {
      title?: string;
      subtitle?: string;
    };
  };
};

export function PlaceholderScreen({ route }: PlaceholderScreenProps) {
  const title = route?.params?.title ?? 'Coming soon';
  const subtitle = route?.params?.subtitle ?? 'Màn hình này sẽ được triển khai ở bước tiếp theo.';

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: 16 }}>
      <View className="rounded-3xl bg-white p-5 shadow-sm">
        <Text className="text-xl font-bold text-ink-900">{title}</Text>
        <Text className="mt-2 text-sm leading-6 text-ink-500">{subtitle}</Text>
      </View>
    </ScrollView>
  );
}
