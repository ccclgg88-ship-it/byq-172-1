import { create } from 'zustand';
import type { User } from '@/types';
import { api } from '@/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  unreadCount: number;
  login: (nickname: string, password: string) => Promise<void>;
  register: (nickname: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  isLoading: false,
  isLoggedIn: !!localStorage.getItem('token'),
  unreadCount: 0,

  fetchUnreadCount: async () => {
    try {
      const res = await api.messages.getUnreadCount();
      set({ unreadCount: res.count });
    } catch {
      set({ unreadCount: 0 });
    }
  },

  login: async (nickname, password) => {
    set({ isLoading: true });
    try {
      const { token, user } = await api.auth.login(nickname, password);
      localStorage.setItem('token', token);
      set({ token, user, isLoggedIn: true, isLoading: false });
      const state = useAuthStore.getState();
      await state.fetchUnreadCount();
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
    set({ token: null, user: null, isLoggedIn: false, unreadCount: 0 });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ user: null, token: null, isLoggedIn: false, unreadCount: 0 });
      return;
    }
    try {
      const user = await api.auth.me();
      set({ user, token, isLoggedIn: true });
      const state = useAuthStore.getState();
      await state.fetchUnreadCount();
    } catch {
      localStorage.removeItem('token');
      set({ user: null, token: null, isLoggedIn: false, unreadCount: 0 });
    }
  },
}));
