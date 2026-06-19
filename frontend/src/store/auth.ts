import { create } from 'zustand';
import type { User } from '@/types';
import { api } from '@/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  login: (nickname: string, password: string) => Promise<void>;
  register: (nickname: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  isLoading: false,
  isLoggedIn: !!localStorage.getItem('token'),

  login: async (nickname, password) => {
    set({ isLoading: true });
    try {
      const { token, user } = await api.auth.login(nickname, password);
      localStorage.setItem('token', token);
      set({ token, user, isLoggedIn: true, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  register: async (nickname, password) => {
    set({ isLoading: true });
    try {
      const { token, user } = await api.auth.register(nickname, password);
      localStorage.setItem('token', token);
      set({ token, user, isLoggedIn: true, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ token: null, user: null, isLoggedIn: false });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ user: null, token: null, isLoggedIn: false });
      return;
    }
    try {
      const user = await api.auth.me();
      set({ user, token, isLoggedIn: true });
    } catch {
      localStorage.removeItem('token');
      set({ user: null, token: null, isLoggedIn: false });
    }
  },
}));
