import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface AuthState {
  userCode: string | null;
  isAuthenticated: boolean;
  login: (code: string, password: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      userCode: null,
      isAuthenticated: false,
      login: (code, _password) =>
        set({ userCode: code, isAuthenticated: true }),
      logout: () => set({ userCode: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ userCode, isAuthenticated }) => ({
        userCode,
        isAuthenticated,
      }),
    },
  ),
);