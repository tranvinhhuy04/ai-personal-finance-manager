import React from 'react';
import { Text, View, ActivityIndicator } from 'react-native';
import { Bot, UserRound } from 'lucide-react-native';

export interface ChatMessageData {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  isTyping?: boolean;
}

interface ChatMessageProps {
  message: ChatMessageData;
  darkMode?: boolean;
}

export function ChatMessage({ message, darkMode = false }: ChatMessageProps) {
  const isAssistant = message.role === 'assistant';

  return (
    <View key={message.id} className={`flex-row gap-2 ${isAssistant ? '' : 'justify-end'}`}>
      {isAssistant ? (
        <View className="mt-1 rounded-full bg-emerald-100 p-2">
          <Bot size={16} color="#059669" />
        </View>
      ) : null}

      <View
        className={`max-w-[84%] rounded-[20px] px-4 py-3 ${
          isAssistant
            ? darkMode
              ? 'bg-slate-800'
              : 'bg-slate-50'
            : 'bg-slate-900'
        }`}
      >
        {message.isTyping ? (
          <View className="flex-row items-center gap-2">
            <ActivityIndicator color={isAssistant ? '#059669' : '#ffffff'} size="small" />
            <Text className={`text-sm ${isAssistant ? 'text-slate-600' : 'text-slate-300'}`}>
              Đang viết...
            </Text>
          </View>
        ) : (
          <Text
            className={`text-sm leading-6 ${
              isAssistant
                ? darkMode
                  ? 'text-slate-200'
                  : 'text-slate-800'
                : 'text-white'
            }`}
          >
            {message.text}
          </Text>
        )}
      </View>

      {!isAssistant ? (
        <View className="mt-1 rounded-full bg-slate-200 p-2">
          <UserRound size={16} color="#0f172a" />
        </View>
      ) : null}
    </View>
  );
}
