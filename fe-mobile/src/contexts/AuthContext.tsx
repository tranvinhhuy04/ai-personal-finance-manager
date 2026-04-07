import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { authApi, type AuthUser, type LoginInput, type LoginResult } from '../api/auth';
import { AUTH_STORAGE_KEYS, authStorage } from '../api/axiosClient';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  signIn: (payload: LoginInput) => Promise<LoginResult>;
  verifyTwoFactor: (twoFactorToken: string, code: string) => Promise<LoginResult>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<AuthUser | null>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function readStoredUser() {
  const raw = await AsyncStorage.getItem(AUTH_STORAGE_KEYS.user);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    void bootstrapSession();
  }, []);

  async function bootstrapSession() {
    try {
      const storedToken = await authStorage.getAccessToken();

      if (!storedToken) {
        setUser(null);
        setToken(null);
        return;
      }

      const storedUser = await readStoredUser();

      try {
        const profile = await authApi.getMe();
        const resolvedUser = profile ?? storedUser;

        if (!resolvedUser) {
          throw new Error('Không thể tải hồ sơ người dùng');
        }

        await authApi.persistSession({
          accessToken: storedToken,
          refreshToken: await AsyncStorage.getItem(AUTH_STORAGE_KEYS.refreshToken),
          user: resolvedUser,
        });

        setUser(resolvedUser);
        setToken(storedToken);
      } catch {
        if (storedUser) {
          setUser(storedUser);
          setToken(storedToken);
        } else {
          await authApi.clearSession();
          setUser(null);
          setToken(null);
        }
      }
    } finally {
      setIsBootstrapping(false);
    }
  }

  async function signIn(payload: LoginInput) {
    const result = await authApi.login(payload);

    if (result.requires2FA) {
      return result;
    }

    if (!result.accessToken) {
      throw new Error('Đăng nhập thành công nhưng không nhận được access token');
    }

    await authApi.persistSession({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
    });

    setUser(result.user ?? null);
    setToken(result.accessToken);

    return result;
  }

  async function verifyTwoFactor(twoFactorToken: string, code: string) {
    const result = await authApi.loginWithTwoFactor({ twoFactorToken, code });

    if (!result.accessToken) {
      throw new Error('Xác thực 2FA thành công nhưng không nhận được access token');
    }

    await authApi.persistSession({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
    });

    setUser(result.user ?? null);
    setToken(result.accessToken);

    return result;
  }

  async function signOut() {
    await authApi.clearSession();
    setUser(null);
    setToken(null);
  }

  async function refreshProfile() {
    const profile = await authApi.getMe();

    if (profile) {
      setUser(profile);
      await AsyncStorage.setItem(AUTH_STORAGE_KEYS.user, JSON.stringify(profile));
    }

    return profile;
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token),
      isBootstrapping,
      signIn,
      verifyTwoFactor,
      signOut,
      refreshProfile,
    }),
    [isBootstrapping, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
