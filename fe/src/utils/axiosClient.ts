import axios, { AxiosHeaders } from 'axios';

function readPersistedAuthToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const directToken = localStorage.getItem('accessToken') || localStorage.getItem('token');
  if (directToken) {
    return directToken;
  }

  const authStorage = localStorage.getItem('auth-storage');
  if (!authStorage) {
    return null;
  }

  try {
    const parsed = JSON.parse(authStorage) as { state?: { token?: string | null } };
    return parsed?.state?.token ?? null;
  } catch {
    return null;
  }
}

function clearAuthStorage() {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem('accessToken');
  localStorage.removeItem('token');
  localStorage.removeItem('authUser');
  localStorage.removeItem('auth-storage');
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3000';
const AI_SERVICE_BASE_URL = import.meta.env.VITE_AI_SERVICE_URL || API_BASE_URL;

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
    return Promise.reject(new Error(message));
  }
);
