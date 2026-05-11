import { apiClient } from '@/lib/apiClient';
import type { Wallet, CreateWalletInput } from '@/types/finance';

export function getWallets(): Promise<Wallet[]> {
  return apiClient.getWallets();
}

export function getWallet(walletId: string): Promise<Wallet> {
  return apiClient.getWallet(walletId);
}

export function createWallet(data: CreateWalletInput): Promise<Wallet> {
  return apiClient.createWallet(data);
}

export function updateWallet(
  walletId: string,
  data: { walletName?: string; balance?: number | null; status?: number }
): Promise<Wallet> {
  return apiClient.updateWallet(walletId, data);
}

export function updateWalletStatus(walletId: string, status: number): Promise<Wallet> {
  return apiClient.updateWalletStatus(walletId, status);
}

export function deleteWallet(walletId: string): Promise<void> {
  return apiClient.deleteWallet(walletId);
}

export function hasWalletTransactions(walletId: string): Promise<boolean> {
  return apiClient.hasWalletTransactions(walletId);
}
