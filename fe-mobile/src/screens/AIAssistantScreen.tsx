import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Bot, Send, Sparkles, UserRound } from 'lucide-react-native';

import { financeApi } from '../api/finance';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { SectionCard } from '../components/SectionCard';
import { AI_SUGGESTED_QUESTIONS } from '../utils/demoData';

interface ChatMessage {
  id: string;
  role: 'assistant' | 'user';
  text: string;
}

export function AIAssistantScreen() {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Xin chào, tôi là Fintech AI Assistant. Hãy hỏi về chi tiêu, tiết kiệm hoặc sức khỏe tài chính của bạn.',
    },
  ]);
  const [isSending, setIsSending] = useState(false);

  const handleAsk = async (preset?: string) => {
    const resolvedQuestion = (preset ?? question).trim();
    if (!resolvedQuestion) return;

    setMessages((current) => [
      ...current,
      { id: `user-${Date.now()}`, role: 'user', text: resolvedQuestion },
    ]);
    setQuestion('');
    setIsSending(true);

    try {
      const result = await financeApi.askAI({ question: resolvedQuestion, useLlm: true });
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: result.answer || 'AI chưa có phản hồi chi tiết cho câu hỏi này.',
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: `assistant-error-${Date.now()}`,
          role: 'assistant',
          text: error instanceof Error ? error.message : 'Không thể kết nối AI service lúc này. Vui lòng thử lại.',
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <View className="flex-1 bg-slate-50">
      <ScreenHeader
        eyebrow="Smart AI"
        title="AI Assistant"
        subtitle="Trò chuyện với trợ lý tài chính thông minh được nối trực tiếp qua API gateway."
      />

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          className="flex-1 bg-slate-50"
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}
        >
          <View className="rounded-[24px] bg-slate-900 p-6 shadow-lg">
            <View className="flex-row items-start justify-between gap-4">
              <View className="flex-1">
                <Text className="text-sm font-medium text-slate-300">Fintech Copilot</Text>
                <Text className="mt-2 text-2xl font-bold tracking-tight text-white">Hỏi nhanh về chi tiêu, tiết kiệm và sức khỏe tài chính</Text>
                <Text className="mt-2 text-sm leading-6 text-slate-300">Giao diện chat được tối ưu cho thao tác một tay và phản hồi ngắn gọn, rõ ràng.</Text>
              </View>
              <View className="rounded-full bg-white/10 p-3">
                <Bot size={20} color="#ffffff" />
              </View>
            </View>
          </View>

          <View className="mt-8">
            <SectionCard title="Prompt gợi ý" subtitle="Chạm một lần để gửi nhanh các câu hỏi thường gặp." className="mb-0">
              <View className="flex-row flex-wrap gap-2">
                {AI_SUGGESTED_QUESTIONS.map((item) => (
                  <Pressable
                    key={item}
                    onPress={() => void handleAsk(item)}
                    className="rounded-full bg-emerald-50 px-4 py-2"
                  >
                    <Text className="text-sm font-medium text-emerald-700">{item}</Text>
                  </Pressable>
                ))}
              </View>
            </SectionCard>
          </View>

          <View className="mt-8">
            <SectionCard title="Trò chuyện" subtitle="AI phản hồi trực tiếp dựa trên câu hỏi và dữ liệu tài chính hiện có." className="mb-0">
              <View className="gap-3">
                {messages.map((message) => {
                  const isAssistant = message.role === 'assistant';

                  return (
                    <View key={message.id} className={`flex-row gap-2 ${isAssistant ? '' : 'justify-end'}`}>
                      {isAssistant ? (
                        <View className="mt-1 rounded-full bg-emerald-100 p-2">
                          <Bot size={16} color="#059669" />
                        </View>
                      ) : null}

                      <View className={`max-w-[84%] rounded-[20px] px-4 py-3 ${isAssistant ? 'bg-slate-50' : 'bg-slate-900'}`}>
                        <Text className={`text-sm leading-6 ${isAssistant ? 'text-slate-800' : 'text-white'}`}>{message.text}</Text>
                      </View>

                      {!isAssistant ? (
                        <View className="mt-1 rounded-full bg-slate-200 p-2">
                          <UserRound size={16} color="#0f172a" />
                        </View>
                      ) : null}
                    </View>
                  );
                })}

                {isSending ? (
                  <View className="flex-row items-center gap-2 rounded-[18px] bg-slate-50 px-4 py-3">
                    <ActivityIndicator color="#059669" />
                    <Text className="text-sm text-slate-500">AI đang phân tích dữ liệu...</Text>
                  </View>
                ) : null}
              </View>
            </SectionCard>
          </View>

          <View className="mt-8">
            <SectionCard title="Đặt câu hỏi mới" subtitle="Input lớn, rõ ràng, thuận tiện cho mobile UI/UX." className="mb-0">
              <View className="gap-3">
                <TextInput
                  value={question}
                  onChangeText={setQuestion}
                  multiline
                  numberOfLines={4}
                  placeholder="Ví dụ: Hãy phân tích 3 khoản chi lớn nhất tháng này và cho tôi lời khuyên tiết kiệm."
                  textAlignVertical="top"
                  className="min-h-[120px] rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900"
                />

                <PrimaryButton
                  label="Gửi câu hỏi cho AI"
                  loading={isSending}
                  icon={<Send size={16} color="#ffffff" />}
                  onPress={() => void handleAsk()}
                />
              </View>
            </SectionCard>
          </View>

          <View className="mt-8 rounded-[24px] border border-emerald-100 bg-emerald-50 p-4">
            <View className="mb-2 flex-row items-center gap-2">
              <Sparkles size={16} color="#059669" />
              <Text className="font-semibold text-emerald-900">AI capabilities</Text>
            </View>
            {[
              'Phân tích tổng chi tiêu, danh mục nổi bật và xu hướng dòng tiền.',
              'Đưa ra lời khuyên tiết kiệm ngắn gọn và hành động cụ thể.',
              'Sẵn sàng kết hợp OCR hóa đơn ở bước mở rộng tiếp theo.',
            ].map((item) => (
              <Text key={item} className="mt-1 text-sm leading-6 text-emerald-800">• {item}</Text>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
