import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setLogin: (user: User, token: string) => void;
  setMockLogin: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      // Đăng nhập thật: lưu user và JWT token vào store
      setLogin: (user, token) => set({ user, token, isAuthenticated: true }),
      // Đăng nhập demo không cần backend – dùng để test UI nhanh
      setMockLogin: () => set({
        user: {
          id: 'mock-id',
          name: 'Demo User',
          email: 'demo@example.com',
          avatar: 'https://i.pravatar.cc/150?img=3',
        },
        token: 'mock-token',
        isAuthenticated: true,
      }),
      // Logout: xóa hết localStorage và reset Zustand state về chưa đăng nhập
      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('token');
          localStorage.removeItem('authUser');
          localStorage.removeItem('auth-storage');
        }

        set({ user: null, token: null, isAuthenticated: false });
      },
    }),
    {
      // Zustand persist: chỉ lưu 3 field này vào localStorage (key 'auth-storage')
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
    }
  )
);
