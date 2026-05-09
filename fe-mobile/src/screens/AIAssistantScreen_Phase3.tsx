/**
 * PHASE 3: AI Chatbot Screen - Complete Refactor
 * 
 * Features:
 * - FlatList-based message display for performance
 * - ChatInput component at bottom (keyboard avoidance)
 * - Typing indicator for AI responses
 * - Proper SafeAreaView integration
 * - Dark mode support
 * - Real-time message streaming UX
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  View,
  ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Bot, Sparkles } from 'lucide-react-native';

import { financeApi } from '../api/finance';
import { ChatInput } from '../components/ChatInput';
import { ChatMessage, type ChatMessageData } from '../components/ChatMessage';
import { ScreenHeader } from '../components/ScreenHeader';
import { useAppPreferences } from '../hooks/useAppPreferences';
import { useCashflow } from '../hooks/useCashflow';
import { AI_SUGGESTED_QUESTIONS } from '../utils/demoData';

interface ExtendedChatMessage extends ChatMessageData {
  timestamp?: number;
}

function isGenericAiFallback(answer: string) {
  const normalized = answer.trim().toLowerCase();
  return (
    normalized.includes('mình là trợ lý tài chính fin') &&
    normalized.includes('quản lý tiền bạc và đầu tư')
  );
}

function isPlaceholderAiInsight(answer: string) {
  const normalized = answer.trim().toLowerCase();
  return (
    normalized.includes('backend gửi thêm') ||
    normalized.includes('analytics-service') ||
    normalized.includes('dữ liệu tài chính đã tổng hợp')
  );
}

export function AIAssistantScreen() {
  const { preferences } = useAppPreferences();
  const analytics = useCashflow('month');
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<ExtendedChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: '👋 Xin chào! Tôi là Fintech AI Assistant. Hãy hỏi về chi tiêu, tiết kiệm hoặc sức khỏe tài chính của bạn. Tôi sẽ phân tích dữ liệu của bạn và đưa ra lời khuyên chi tiết.',
      timestamp: Date.now(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRefReady = useRef(false);

  const scrollToBottom = useCallback(() => {
    if (flatListRefReady.current && messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages.length]);

  const handleViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0) {
        flatListRefReady.current = true;
      }
    },
    []
  );

  const handleAsk = useCallback(
    async (preset?: string) => {
      const resolvedQuestion = (preset ?? inputValue).trim();
      if (!resolvedQuestion) return;

      // Add user message
      const userMessageId = `user-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: userMessageId,
          role: 'user',
          text: resolvedQuestion,
          timestamp: Date.now(),
        },
      ]);
      setInputValue('');

      // Add typing indicator
      const typingIndicatorId = `typing-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: typingIndicatorId,
          role: 'assistant',
          text: '',
          isTyping: true,
          timestamp: Date.now(),
        },
      ]);

      setIsLoading(true);

      try {
        const result = await financeApi.askAI({
          question: resolvedQuestion,
          useLlm: true,
          range: 'month',
          context: analytics.data
            ? {
                period: analytics.data.period,
                summary: analytics.data.summary,
                kpis: analytics.data.kpis,
                breakdown: analytics.data.breakdown?.slice(0, 6),
                comparison: analytics.data.comparison?.slice(0, 6),
                budgetProgress: analytics.data.budgetProgress?.slice(0, 5),
                topTransactions: analytics.data.topTransactions?.slice(0, 5),
                subscriptions: analytics.data.subscriptions?.slice(0, 5),
              }
            : {},
        });

        const answer = result.answer?.trim();
        const safeAnswer =
          answer &&
          !isGenericAiFallback(answer) &&
          !isPlaceholderAiInsight(answer)
            ? answer
            : '📊 Mình đã nhận được câu hỏi của bạn nhưng hiện chưa đủ ngữ cảnh để tạo tư vấn sâu ngay. Bạn có thể:\n\n• Xem tab Analytics để lấy insight chi tiết\n• Hỏi cụ thể hơn về tổng chi, tổng thu\n• Nêu danh mục chi đang quan tâm';

        // Replace typing indicator with actual response
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === typingIndicatorId
              ? {
                  ...msg,
                  text: safeAnswer,
                  isTyping: false,
                  timestamp: Date.now(),
                }
              : msg
          )
        );
      } catch (error) {
        const errorText = error instanceof Error ? error.message : 'Không thể kết nối AI service lúc này. Vui lòng thử lại.';

        // Replace typing indicator with error
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === typingIndicatorId
              ? {
                  ...msg,
                  text: `❌ Lỗi: ${errorText}`,
                  isTyping: false,
                  timestamp: Date.now(),
                }
              : msg
          )
        );
      } finally {
        setIsLoading(false);
        scrollToBottom();
      }
    },
    [inputValue, analytics.data, scrollToBottom]
  );

  const handleSend = useCallback(() => {
    void handleAsk();
  }, [handleAsk]);

  return (
    <SafeAreaView
      className={`flex-1 ${preferences.darkMode ? 'bg-slate-950' : 'bg-slate-50'}`}
      edges={['top', 'left', 'right']}
    >
      <ScreenHeader
        eyebrow="Smart AI"
        title="AI Assistant"
        subtitle="Trò chuyện với trợ lý tài chính thông minh được nối trực tiếp qua API gateway."
      />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 50 : 0}
      >
        {/* Messages List */}
        <View className="flex-1">
          {messages.length === 0 ? (
            <View className={`flex-1 items-center justify-center px-6 ${preferences.darkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
              <View className="rounded-full bg-emerald-100 p-4 mb-4">
                <Bot size={32} color="#059669" />
              </View>
              <Text className={`text-lg font-bold text-center ${preferences.darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                Hãy bắt đầu cuộc trò chuyện
              </Text>
              <Text className={`mt-2 text-center text-sm leading-6 ${preferences.darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Hỏi tôi về chi tiêu, tiết kiệm, hoặc sức khỏe tài chính của bạn.
              </Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={({ item }) => (
                <ChatMessage message={item} darkMode={preferences.darkMode} />
              )}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{
                paddingHorizontal: 16,
                paddingVertical: 12,
                gap: 12,
              }}
              onViewableItemsChanged={handleViewableItemsChanged}
              viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
              scrollEventThrottle={16}
              onContentSizeChange={scrollToBottom}
            />
          )}
        </View>

        {/* Suggested Questions - Show only if few messages */}
        {messages.length <= 1 && (
          <View className={`px-4 py-3 border-t ${preferences.darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}>
            <Text className={`mb-2 text-xs font-semibold ${preferences.darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              GỢI Ý CÂU HỎI
            </Text>
            <View className="gap-2">
              {AI_SUGGESTED_QUESTIONS.slice(0, 3).map((item) => (
                <LinearGradient
                  key={item}
                  colors={['#f0fdf4', '#dcfce7']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  className="rounded-2xl p-3"
                >
                  <Text
                    numberOfLines={2}
                    className="text-xs text-emerald-700 font-medium"
                    onPress={() => void handleAsk(item)}
                  >
                    • {item}
                  </Text>
                </LinearGradient>
              ))}
            </View>
          </View>
        )}

        {/* Chat Input */}
        <View className={`border-t px-4 py-3 ${preferences.darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}>
          <ChatInput
            value={inputValue}
            onChangeText={setInputValue}
            onSend={handleSend}
            isLoading={isLoading}
            placeholder="Hỏi tôi điều gì..."
            darkMode={preferences.darkMode}
            multiline={false}
            numberOfLines={1}
          />
          <Text className={`mt-2 text-xs text-center ${preferences.darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
            Dữ liệu của bạn được xử lý một cách bảo mật trên server
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
