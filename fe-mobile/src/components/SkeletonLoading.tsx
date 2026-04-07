import React from 'react';
import { ScrollView, View } from 'react-native';

export function SkeletonLoading() {
  return (
    <ScrollView showsVerticalScrollIndicator={false} className="flex-1 bg-slate-50">
      <View className="animate-pulse px-5 pt-4 pb-10">
        <View className="mb-6">
          <View className="h-3 w-24 rounded-full bg-slate-200" />
          <View className="mt-3 h-8 w-44 rounded-xl bg-slate-200" />
          <View className="mt-2 h-4 w-72 rounded-xl bg-slate-100" />
        </View>

        <View className="rounded-[24px] bg-emerald-500/90 p-6 shadow-lg">
          <View className="h-4 w-32 rounded-full bg-emerald-300/70" />
          <View className="mt-3 h-10 w-48 rounded-xl bg-emerald-300/70" />
          <View className="mt-4 border-t border-emerald-400/50 pt-4">
            <View className="h-3 w-36 rounded-full bg-emerald-300/60" />
          </View>
        </View>

        <View className="mt-6 flex-row justify-between">
          {[0, 1].map((item) => (
            <View key={item} className="w-[48%] rounded-2xl bg-white p-4 shadow-sm">
              <View className="h-10 w-10 rounded-full bg-slate-100" />
              <View className="mt-4 h-3 w-20 rounded-full bg-slate-200" />
              <View className="mt-2 h-6 w-24 rounded-xl bg-slate-200" />
              <View className="mt-2 h-3 w-16 rounded-full bg-slate-100" />
            </View>
          ))}
        </View>

        <View className="mt-8">
          <View className="mb-4 flex-row items-center justify-between">
            <View>
              <View className="h-5 w-28 rounded-full bg-slate-200" />
              <View className="mt-2 h-3 w-44 rounded-full bg-slate-100" />
            </View>
            <View className="h-8 w-28 rounded-full bg-slate-200" />
          </View>
          <View className="rounded-[24px] bg-white p-4 shadow-sm">
            {[0, 1].map((item) => (
              <View key={item} className="mb-3 h-36 rounded-[22px] bg-slate-100" />
            ))}
          </View>
        </View>

        <View className="mt-8">
          <View className="mb-4 flex-row items-center justify-between">
            <View>
              <View className="h-5 w-24 rounded-full bg-slate-200" />
              <View className="mt-2 h-3 w-40 rounded-full bg-slate-100" />
            </View>
            <View className="h-8 w-28 rounded-full bg-slate-200" />
          </View>
          <View className="rounded-[24px] bg-white p-4 shadow-sm">
            <View className="h-40 flex-row items-end gap-2">
              {[0, 1, 2, 3, 4, 5].map((item) => (
                <View key={item} className="flex-1 items-center">
                  <View className="h-28 w-full rounded-[18px] bg-slate-100" />
                  <View className="mt-2 h-3 w-8 rounded-full bg-slate-100" />
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
