import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const expoEnv =
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};

const expoExtra = (Constants.expoConfig?.extra ?? {}) as {
  apiBaseUrl?: string;
  aiServiceUrl?: string;
  devAccessToken?: string;
  apiTimeoutMs?: string | number;
  authTimeoutMs?: string | number;
  aiTimeoutMs?: string | number;
};

// Token tạm dùng cho dev/test – dán JWT thật vào đây để bỏ qua màn Login.
// KHÔNG commit giá trị thật lên git; để trống ('') trong production.
const TEMP_ACCESS_TOKEN = '';
// Dán JWT thật vào `TEMP_ACCESS_TOKEN` hoặc `EXPO_PUBLIC_ACCESS_TOKEN` để test nhanh khi chưa có màn Login.

export const AUTH_STORAGE_KEYS = {
  token: 'accessToken',
  legacyToken: 'token',
  refreshToken: 'refreshToken',
  user: 'authUser',
  persistedAuth: 'auth-storage',
} as const;

const maybeHostUri =
  (Constants as any)?.expoConfig?.hostUri ||
  (Constants as any)?.expoConfig?.debuggerHost ||
  (Constants as any)?.expoGoConfig?.debuggerHost ||
  (Constants as any)?.manifest2?.extra?.expoClient?.hostUri ||
  (Constants as any)?.manifest?.debuggerHost ||
  '';

function extractHost(value?: string) {
  const source = String(value || '').trim();
  if (!source) {
    return undefined;
  }

  const noScheme = source.replace(/^[a-zA-Z]+:\/\//, '');
  const hostPart = noScheme.split('/')[0]?.trim() || '';
  const host = hostPart.split(':')[0]?.trim() || '';
  return host || undefined;
}

const webLocationHost =
  typeof globalThis !== 'undefined' && (globalThis as any).location?.host
    ? extractHost(String((globalThis as any).location.host))
    : undefined;
const inferredExpoHost =
  extractHost(maybeHostUri) ||
  webLocationHost ||
  undefined;

const inferredLanBaseUrl =
  inferredExpoHost && /^(?:\d{1,3}\.){3}\d{1,3}$/.test(inferredExpoHost)
    ? `http://${inferredExpoHost}:3000`
    : undefined;

function normalizeBaseUrl(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed.replace(/\/+$/, '') : undefined;
}

function readTimeoutMs(...values: Array<unknown>) {
  for (const value of values) {
    if (value == null) {
      continue;
    }

    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 1000) {
      return Math.floor(parsed);
    }
  }

  return undefined;
}

// Địa chỉ fallback theo từng nền tảng:
// - Android Emulator dùng 10.0.2.2 (alias trỏ về localhost của máy host)
// - iOS Simulator / máy thật dùng 127.0.0.1
const fallbackBaseUrl = Platform.select({
  android: 'http://10.0.2.2:3000',
  ios: 'http://127.0.0.1:3000',
  default: 'http://127.0.0.1:3000',
});

// Thứ tự ưu tiên chọn base URL:
// 1. Biến môi trường EXPO_PUBLIC_API_BASE_URL (.env)
// 2. IP LAN tự suy ra từ Expo debugger host (khi dùng Expo Go trên thiết bị thật)
// 3. Giá trị trong app.config.js extra.apiBaseUrl
// 4. Fallback theo platform (android/ios/default)
const apiBaseCandidatesRaw = [
  normalizeBaseUrl(expoEnv.EXPO_PUBLIC_API_BASE_URL),
  normalizeBaseUrl(inferredLanBaseUrl),
  normalizeBaseUrl(expoExtra.apiBaseUrl),
  normalizeBaseUrl(fallbackBaseUrl),
  'http://127.0.0.1:3000',
].filter((value): value is string => Boolean(value));

export const API_BASE_URL_CANDIDATES = Array.from(new Set(apiBaseCandidatesRaw));

export const API_BASE_URL = API_BASE_URL_CANDIDATES[0] || 'http://127.0.0.1:3000';

export const AI_SERVICE_BASE_URL =
  normalizeBaseUrl(expoEnv.EXPO_PUBLIC_AI_SERVICE_URL) ||
  normalizeBaseUrl(inferredLanBaseUrl) ||
  normalizeBaseUrl(expoExtra.aiServiceUrl) ||
  API_BASE_URL;

export const API_TIMEOUT_MS =
  readTimeoutMs(expoEnv.EXPO_PUBLIC_API_TIMEOUT_MS, expoExtra.apiTimeoutMs) ||
  30000;

export const AUTH_TIMEOUT_MS =
  readTimeoutMs(expoEnv.EXPO_PUBLIC_AUTH_TIMEOUT_MS, expoExtra.authTimeoutMs) ||
  45000;

export const AI_TIMEOUT_MS =
  readTimeoutMs(expoEnv.EXPO_PUBLIC_AI_TIMEOUT_MS, expoExtra.aiTimeoutMs) ||
  120000;

function normalizeToken(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim().replace(/^Bearer\s+/i, '');
  return trimmed || null;
}

// Đọc token từ chuỗi JSON đã được persist (tương thích cả Zustand và format tùy chỉnh).
// Hỗ trợ 2 cấu trúc: { state: { token } } (Zustand persist) và { token } (flat).
function readPersistedStateToken(raw: string | null) {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as {
      token?: string;
      accessToken?: string;
      state?: { token?: string; accessToken?: string };
    };

    return (
      normalizeToken(parsed.state?.token) ||
      normalizeToken(parsed.state?.accessToken) ||
      normalizeToken(parsed.token) ||
      normalizeToken(parsed.accessToken)
    );
  } catch {
    // JSON bị corrupt → bỏ qua và coi như chưa đăng nhập
    return null;
  }
}

// Đọc JWT access token từ AsyncStorage theo thứ tự ưu tiên:
// 1. Key 'accessToken' (backend trả về)
// 2. Key 'token' (legacy key)
// 3. JSON persist 'auth-storage' (Zustand)
// 4. TEMP_ACCESS_TOKEN / biến env dev (chỉ dùng khi test, không có màn Login)
async function readAccessToken() {
  const directToken =
    normalizeToken(await AsyncStorage.getItem(AUTH_STORAGE_KEYS.token)) ||
    normalizeToken(await AsyncStorage.getItem(AUTH_STORAGE_KEYS.legacyToken)) ||
    readPersistedStateToken(await AsyncStorage.getItem(AUTH_STORAGE_KEYS.persistedAuth));

  const fallbackToken =
    normalizeToken(TEMP_ACCESS_TOKEN) ||
    normalizeToken(expoEnv.EXPO_PUBLIC_ACCESS_TOKEN) ||
    normalizeToken(expoExtra.devAccessToken);

  return directToken || fallbackToken;
}

// Xóa toàn bộ dữ liệu xác thực khỏi AsyncStorage.
// Được gọi khi logout hoặc khi server trả về 401 Unauthorized.
async function clearAuthData() {
  await Promise.all([
    AsyncStorage.removeItem(AUTH_STORAGE_KEYS.token),
    AsyncStorage.removeItem(AUTH_STORAGE_KEYS.legacyToken),
    AsyncStorage.removeItem(AUTH_STORAGE_KEYS.refreshToken),
    AsyncStorage.removeItem(AUTH_STORAGE_KEYS.user),
    AsyncStorage.removeItem(AUTH_STORAGE_KEYS.persistedAuth),
  ]);
}

// Request interceptor: tự động đính kèm Bearer token vào mọi request.
// Async vì AsyncStorage.getItem là bất đồng bộ trên React Native.
async function attachAuthToken(config: InternalAxiosRequestConfig) {
  const token = await readAccessToken();

  if (!token) {
    return config;
  }

  if (!config.headers) {
    config.headers = new AxiosHeaders();
  }

  if (config.headers instanceof AxiosHeaders) {
    config.headers.set('Authorization', `Bearer ${token}`);
  } else {
    (config.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  return config;
}

function normalizeApiError(error: any) {
  const message = error?.response?.data?.message || error?.message || 'Request failed';
  const normalizedError = new Error(message) as Error & {
    status?: number;
    code?: string;
    data?: unknown;
  };

  normalizedError.status = error?.response?.status;
  normalizedError.code = error?.code;
  normalizedError.data = error?.response?.data;

  if (error?.response?.status === 401) {
    void clearAuthData();
  }

  return Promise.reject(normalizedError);
}

export const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': '1',
  },
});

export const authAxiosClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: AUTH_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': '1',
  },
});

export const aiAxiosClient = axios.create({
  baseURL: AI_SERVICE_BASE_URL,
  timeout: AI_TIMEOUT_MS,
  headers: {
    'ngrok-skip-browser-warning': '1',
  },
});

axiosClient.interceptors.request.use(attachAuthToken);
authAxiosClient.interceptors.request.use(attachAuthToken);
aiAxiosClient.interceptors.request.use(attachAuthToken);

axiosClient.interceptors.response.use((response: any) => response, normalizeApiError);
authAxiosClient.interceptors.response.use((response: any) => response, normalizeApiError);
aiAxiosClient.interceptors.response.use((response: any) => response, normalizeApiError);

export const authStorage = {
  getAccessToken: readAccessToken,
  setAccessToken: async (token: string) => {
    const normalizedToken = normalizeToken(token);

    if (!normalizedToken) {
      await Promise.all([
        AsyncStorage.removeItem(AUTH_STORAGE_KEYS.token),
        AsyncStorage.removeItem(AUTH_STORAGE_KEYS.legacyToken),
      ]);
      return;
    }

    await Promise.all([
      AsyncStorage.setItem(AUTH_STORAGE_KEYS.token, normalizedToken),
      AsyncStorage.setItem(AUTH_STORAGE_KEYS.legacyToken, normalizedToken),
    ]);
  },
  clearSession: clearAuthData,
};
