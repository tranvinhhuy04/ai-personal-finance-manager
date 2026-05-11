import { AppError } from '../errors/AppError';

const WALLET_SERVICE_URL = process.env.WALLET_SERVICE_URL ?? 'http://service-wallet:3002';
const INTERNAL_FETCH_TIMEOUT_MS = Number(process.env.INTERNAL_FETCH_TIMEOUT_MS ?? 8_000);

export type WalletSnapshot = {
  id: string;
  balance: string;
  wallet_name: string;
  wallet_type: string;
};

export async function fetchUserWallets(authorization: string): Promise<WalletSnapshot[]> {
  const response = await fetch(`${WALLET_SERVICE_URL}/api/v1/wallets`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: authorization,
    },
    signal: AbortSignal.timeout(INTERNAL_FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new AppError(`Không thể kiểm tra thông tin ví: ${text || response.statusText}`, 502);
  }

  const payload = await response.json();
  return Array.isArray(payload) ? (payload as WalletSnapshot[]) : [];
}

export async function requireOwnedWallet(
  walletId: string,
  authorization: string,
): Promise<WalletSnapshot> {
  const wallets = await fetchUserWallets(authorization);
  const matched = wallets.find((w) => w.id === walletId);
  if (!matched) {
    throw new AppError('Wallet not found or does not belong to current user', 404);
  }
  return matched;
}
