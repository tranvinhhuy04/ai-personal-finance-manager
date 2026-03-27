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
      setLogin: (user, token) => set({ user, token, isAuthenticated: true }),
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
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
    }
  )
);
