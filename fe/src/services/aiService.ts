import { apiClient } from '@/lib/apiClient';
import type { AIChatRequest, AIChatResponse, AIExtractTextResponse } from '@/types/finance';

export function sendAIChat(payload: AIChatRequest): Promise<AIChatResponse> {
  return apiClient.askAI(payload);
}

export function extractTextTransactions(text: string): Promise<AIExtractTextResponse> {
  return apiClient.extractTransactionsFromText(text);
}
