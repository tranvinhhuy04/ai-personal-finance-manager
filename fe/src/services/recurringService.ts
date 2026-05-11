import { apiClient } from '@/lib/apiClient';
import type {
  RecurringRule,
  CreateRecurringRuleInput,
  UpdateRecurringRuleInput,
} from '@/types/finance';

export function getRecurringRules(): Promise<RecurringRule[]> {
  return apiClient.getRecurringRules();
}

export function createRecurringRule(data: CreateRecurringRuleInput): Promise<RecurringRule> {
  return apiClient.createRecurringRule(data);
}

export function updateRecurringRule(
  ruleId: string,
  data: UpdateRecurringRuleInput
): Promise<RecurringRule> {
  return apiClient.updateRecurringRule(ruleId, data);
}

export function deleteRecurringRule(ruleId: string): Promise<{ success: boolean; id: string }> {
  return apiClient.deleteRecurringRule(ruleId);
}
