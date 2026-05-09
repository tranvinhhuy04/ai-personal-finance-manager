import React from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles } from 'lucide-react-native';

interface NLPQuickEntryProps {
  input: string;
  onInputChange: (text: string) => void;
  isLoading: boolean;
  onExtract: () => void;
  placeholder?: string;
  darkMode?: boolean;
}

/**
 * NLP Quick Entry Component for PHASE 2
 * Handles natural language transaction recognition
 * Features:
 * - Text input for natural language commands
 * - Loading state with spinner
 * - Responsive button with feedback
 * - Dark mode support
 */
export function NLPQuickEntry({
  input,
  onInputChange,
  isLoading,
  onExtract,
  placeholder = 'VD: hôm nay uống cafe 50k',
  darkMode = false,
}: NLPQuickEntryProps) {
  return (
    <View className="mb-5 overflow-hidden rounded-[24px]" style={{ 
      shadowColor: '#0f172a', 
      shadowOffset: { width: 0, height: 4 }, 
      shadowOpacity: 0.08, 
      shadowRadius: 12, 
      elevation: 3 
    }}>
      <LinearGradient 
        colors={['#1e3a5f', '#0f172a']} 
        start={{ x: 0, y: 0 }} 
        end={{ x: 1, y: 1 }} 
        className="p-5"
      >
        {/* Header */}
        <View className="mb-3 flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
            <Sparkles size={18} color="#6ee7b7" />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-bold text-white">Ghi nhận bằng ngôn ngữ tự nhiên</Text>
            <Text className="text-xs text-slate-400">Ví dụ: "hôm nay uống cafe 50k"</Text>
          </View>
        </View>

        {/* Text Input */}
        <TextInput
          value={input}
          onChangeText={onInputChange}
          placeholder={placeholder}
          placeholderTextColor="#94a3b8"
          editable={!isLoading}
          className="min-h-[46px] rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-slate-100"
        />

        {/* Extract Button */}
        <Pressable
          onPress={onExtract}
          disabled={isLoading || !input.trim()}
          className={`mt-3 min-h-[44px] overflow-hidden rounded-2xl ${isLoading || !input.trim() ? 'opacity-60' : ''}`}
        >
          <LinearGradient 
            colors={['#059669', '#047857', '#065f46']} 
            start={{ x: 0, y: 0 }} 
            end={{ x: 1, y: 1 }} 
            className="flex-row items-center justify-center gap-2 px-4 py-3.5"
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Sparkles size={16} color="#ffffff" />
            )}
            <Text className="flex-shrink text-center text-sm font-extrabold text-white" numberOfLines={1}>
              {isLoading ? 'Đang xử lý câu lệnh...' : 'Phân tích câu lệnh'}
            </Text>
          </LinearGradient>
        </Pressable>

        {/* Loading indicator */}
        {isLoading && (
          <View className="mt-3 flex-row items-center gap-2">
            <ActivityIndicator size="small" color="#6ee7b7" />
            <Text className="text-xs text-slate-400">Gửi câu lệnh tới AI để phân tích…</Text>
          </View>
        )}
      </LinearGradient>
    </View>
  );
}
