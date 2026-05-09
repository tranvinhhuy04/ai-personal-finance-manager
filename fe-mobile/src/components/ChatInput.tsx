import React from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Send } from 'lucide-react-native';

interface ChatInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  placeholder?: string;
  isLoading?: boolean;
  darkMode?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
}

export function ChatInput({
  value,
  onChangeText,
  onSend,
  placeholder = 'Nhập câu hỏi...',
  isLoading = false,
  darkMode = false,
  multiline = false,
  numberOfLines = 1,
}: ChatInputProps) {
  return (
    <View className="flex-row items-center gap-3 px-4 py-3 rounded-[24px] bg-white border border-slate-200">
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        editable={!isLoading}
        multiline={multiline}
        numberOfLines={numberOfLines}
        textAlignVertical={multiline ? 'top' : 'center'}
        className={`flex-1 text-base ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}
      />
      <Pressable
        onPress={onSend}
        disabled={isLoading || !value.trim()}
        className={`h-10 w-10 items-center justify-center rounded-full bg-emerald-600 ${
          isLoading || !value.trim() ? 'opacity-50' : ''
        }`}
      >
        <Send size={18} color="#ffffff" />
      </Pressable>
    </View>
  );
}
