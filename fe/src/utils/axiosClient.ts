import axios, { AxiosHeaders } from 'axios';

// Đọc JWT token đang được lưu trong localStorage.
// Ưu tiên key 'accessToken' / 'token' (backend trả về trực tiếp),
// nếu không có thì fallback vào object 'auth-storage' do Zustand persist lưu.
function readPersistedAuthToken(): string | null {
  if (typeof window === 'undefined') {
    // SSR guard – không truy cập localStorage ngoài browser
    return null;
  }

  const directToken = localStorage.getItem('accessToken') || localStorage.getItem('token');
  if (directToken) {
    return directToken;
  }

  // Fallback: Zustand persist lưu toàn bộ state dưới dạng JSON string
  const authStorage = localStorage.getItem('auth-storage');
  if (!authStorage) {
    return null;
  }

  try {
    const parsed = JSON.parse(authStorage) as { state?: { token?: string | null } };
    return parsed?.state?.token ?? null;
  } catch {
    // JSON parse lỗi (dữ liệu bị corrupt) → coi như chưa đăng nhập
    return null;
  }
}

// Xóa toàn bộ thông tin xác thực khỏi localStorage.
// Được gọi khi người dùng logout hoặc khi server trả về 401.
function clearAuthStorage() {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem('accessToken');
  localStorage.removeItem('token');
  localStorage.removeItem('authUser');
  localStorage.removeItem('auth-storage');
}

// Endpoint API Gateway – đọc từ biến môi trường VITE_API_BASE_URL (.env)
// Mặc định trỏ về localhost:3000 khi chạy dev; để trống ('') cho Vercel (same-origin)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:3000';
// AI Service có thể chạy trên port riêng; nếu không khai báo thì dùng chung API Gateway
const AI_SERVICE_BASE_URL = import.meta.env.VITE_AI_SERVICE_URL ?? API_BASE_URL;

export const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const aiAxiosClient = axios.create({
  baseURL: AI_SERVICE_BASE_URL,
  timeout: 120000,
});

// Request interceptor: tự động đính kèm header Authorization vào mọi request.
// Không cần truyền token thủ công tại từng API call.
function attachAuthToken(config: any) {
  const token = readPersistedAuthToken();

  if (token) {
    if (!config.headers) {
      config.headers = new AxiosHeaders();
    }

    if (config.headers instanceof AxiosHeaders) {
      config.headers.set('Authorization', `Bearer ${token}`);
    } else {
      (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
    }
  }

  return config;
}

axiosClient.interceptors.request.use(attachAuthToken);
aiAxiosClient.interceptors.request.use(attachAuthToken);

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      clearAuthStorage();
      if (typeof window !== 'undefined' && window.location.pathname !== '/auth') {
        window.location.href = '/auth';
      }
    }

    const message =
      error?.response?.data?.message ||
      error?.message ||
      'Request failed';

    const normalizedError = new Error(message) as Error & {
      status?: number;
      code?: string;
      data?: unknown;
    };

    normalizedError.status = error?.response?.status;
    normalizedError.code = error?.code;
    normalizedError.data = error?.response?.data;

    return Promise.reject(normalizedError);
  }
);
