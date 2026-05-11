import { apiClient } from '@/lib/apiClient';
import type {
  SavingPackage,
  Transaction,
  CreateSavingInput,
  DepositSavingInput,
  SettleSavingInput,
} from '@/types/finance';

export function getSavings(type?: 'SAVING' | 'INVESTMENT'): Promise<SavingPackage[]> {
  return apiClient.getSavings(type);
}

export function createSaving(data: CreateSavingInput): Promise<SavingPackage> {
  return apiClient.createSaving(data);
}

export function depositSaving(savingId: string, data: DepositSavingInput): Promise<{ saving: SavingPackage; transaction: Transaction }> {
  return apiClient.depositToSaving(savingId, data);
}

export function settleSaving(savingId: string, data: SettleSavingInput): Promise<{ saving: SavingPackage; transaction: Transaction | null }> {
  return apiClient.settleSaving(savingId, data);
}

export function deleteSaving(savingId: string): Promise<void> {
  return apiClient.deleteSaving(savingId);
}
