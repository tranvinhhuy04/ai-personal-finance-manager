import AsyncStorage from '@react-native-async-storage/async-storage';

import { AUTH_STORAGE_KEYS, authStorage, axiosClient } from './axiosClient';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  status?: number;
}

export interface LoginInput {
  email: string;
  password: string;
  twoFactorCode?: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
}

export interface TwoFactorLoginInput {
  twoFactorToken: string;
  code: string;
}

export interface LoginResult {
  accessToken?: string | null;
  refreshToken?: string | null;
  requires2FA?: boolean;
  twoFactorToken?: string | null;
  twoFactorEnabled?: boolean;
  user?: AuthUser | null;
  message?: string;
}

function normalizeUser(raw?: Record<string, any> | null): AuthUser | null {
  if (!raw) {
    return null;
  }

  return {
    id: String(raw.userId ?? raw.id ?? raw._id ?? ''),
    email: String(raw.email ?? ''),
    fullName: String(raw.fullName ?? raw.name ?? raw.email ?? 'Người dùng'),
    phone: raw.phone == null ? null : String(raw.phone),
    status: typeof raw.status === 'number' ? raw.status : Number(raw.status ?? 1),
  };
}

function normalizeLoginResult(data: Record<string, any>): LoginResult {
  return {
    accessToken: data.accessToken ?? data.token ?? null,
    refreshToken: data.refreshToken ?? null,
    requires2FA: Boolean(data.requires2FA),
    twoFactorToken: data.twoFactorToken ?? null,
    twoFactorEnabled: Boolean(data.twoFactorEnabled),
    user: normalizeUser(data.user),
    message: data.message ? String(data.message) : undefined,
  };
}

export const authApi = {
  async login(payload: LoginInput): Promise<LoginResult> {
    const response = await axiosClient.post('/api/v1/auth/login', {
      email: payload.email.trim(),
      password: payload.password,
      twoFactorCode: payload.twoFactorCode,
    });

    return normalizeLoginResult(response.data ?? {});
  },

  async register(payload: RegisterInput): Promise<LoginResult> {
    const response = await axiosClient.post('/api/v1/auth/register', {
      email: payload.email.trim(),
      password: payload.password,
      fullName: payload.fullName.trim(),
      phone: payload.phone?.trim() || undefined,
    });

    return normalizeLoginResult(response.data ?? {});
  },

  async loginWithTwoFactor(payload: TwoFactorLoginInput): Promise<LoginResult> {
    const response = await axiosClient.post('/api/v1/auth/login/2fa', {
      twoFactorToken: payload.twoFactorToken,
      code: payload.code,
    });

    return normalizeLoginResult(response.data ?? {});
  },

  async getMe(): Promise<AuthUser | null> {
    const response = await axiosClient.get('/api/v1/auth/me');
    const raw = (response.data?.user ?? response.data) as Record<string, any> | undefined;
    return normalizeUser(raw ?? null);
  },

  async persistSession({
    accessToken,
    refreshToken,
    user,
  }: {
    accessToken: string;
    refreshToken?: string | null;
    user?: AuthUser | null;
  }) {
    await authStorage.setAccessToken(accessToken);

    if (refreshToken) {
      await AsyncStorage.setItem(AUTH_STORAGE_KEYS.refreshToken, refreshToken);
    } else {
      await AsyncStorage.removeItem(AUTH_STORAGE_KEYS.refreshToken);
    }

    if (user) {
      await AsyncStorage.setItem(AUTH_STORAGE_KEYS.user, JSON.stringify(user));
    }
  },

  async clearSession() {
    await authStorage.clearSession();
  },
};
