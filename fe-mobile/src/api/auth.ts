import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  AUTH_STORAGE_KEYS,
  API_BASE_URL_CANDIDATES,
  authAxiosClient,
  authStorage,
  axiosClient,
} from './axiosClient';

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

function shouldRetryAuthRequest(error: any) {
  const code = String(error?.code || '').toUpperCase();
  const status = Number(error?.status || error?.response?.status || 0);
  const message = String(error?.message || '').toLowerCase();

  if (code === 'ECONNABORTED') {
    return true;
  }

  if (message.includes('timeout') || message.includes('network error')) {
    return true;
  }

  return status === 502 || status === 503 || status === 504;
}

async function withAuthRetry<T>(run: () => Promise<T>) {
  try {
    return await run();
  } catch (error) {
    if (!shouldRetryAuthRequest(error)) {
      throw error;
    }

    return run();
  }
}

async function postAuthWithFailover(path: string, payload: Record<string, unknown>) {
  let lastError: unknown;

  for (const baseURL of API_BASE_URL_CANDIDATES) {
    try {
      const response = await withAuthRetry(() => authAxiosClient.post(path, payload, { baseURL }));
      return response;
    } catch (error) {
      lastError = error;

      if (!shouldRetryAuthRequest(error)) {
        throw error;
      }
    }
  }

  throw (lastError || new Error('Không thể kết nối đến máy chủ xác thực.'));
}

function mapAuthError(error: any): never {
  const code = String(error?.code || '').toUpperCase();
  const message = String(error?.message || '').toLowerCase();

  if (code === 'ECONNABORTED' || message.includes('timeout')) {
    throw new Error('Kết nối máy chủ đăng nhập quá chậm. Vui lòng thử lại trong ít giây.');
  }

  if (message.includes('network error')) {
    throw new Error('Không kết nối được tới máy chủ. Hãy kiểm tra API URL hoặc mạng hiện tại.');
  }

  throw error;
}

export const authApi = {
  async login(payload: LoginInput): Promise<LoginResult> {
    try {
      const response = await postAuthWithFailover('/api/v1/auth/login', {
        email: payload.email.trim(),
        password: payload.password,
        twoFactorCode: payload.twoFactorCode,
      });

      return normalizeLoginResult(response.data ?? {});
    } catch (error) {
      mapAuthError(error);
    }
  },

  async register(payload: RegisterInput): Promise<LoginResult> {
    try {
      const response = await postAuthWithFailover('/api/v1/auth/register', {
        email: payload.email.trim(),
        password: payload.password,
        fullName: payload.fullName.trim(),
        phone: payload.phone?.trim() || undefined,
      });

      return normalizeLoginResult(response.data ?? {});
    } catch (error) {
      mapAuthError(error);
    }
  },

  async loginWithTwoFactor(payload: TwoFactorLoginInput): Promise<LoginResult> {
    try {
      const response = await postAuthWithFailover('/api/v1/auth/login/2fa', {
        twoFactorToken: payload.twoFactorToken,
        code: payload.code,
      });

      return normalizeLoginResult(response.data ?? {});
    } catch (error) {
      mapAuthError(error);
    }
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
