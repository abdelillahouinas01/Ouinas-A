// Authentication store (Zustand)
import { create } from 'zustand';
import type { User } from '../types';
import apiClient from '../services/api';

interface AuthStore {
  user: User | null;
  credits: number;
  isDeveloper: boolean;
  isLoading: boolean;
  error: string | null;
  login: (user: User, credits: number) => void;
  logout: () => void;
  setDeveloper: (isDeveloper: boolean) => void;
  setError: (error: string | null) => void;
  refreshUser: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  credits: 0,
  isDeveloper: false,
  isLoading: false,
  error: null,

  login: (user: User, credits: number) => {
    set({ user, credits, error: null });
  },

  logout: () => {
    set({ user: null, credits: 0, isDeveloper: false });
  },

  setDeveloper: (isDeveloper: boolean) => {
    set({ isDeveloper });
  },

  setError: (error: string | null) => {
    set({ error });
  },

  refreshUser: async () => {
    try {
      set({ isLoading: true });
      const data = await apiClient.getCurrentUser();
      set({ user: data.user, credits: data.credits, error: null, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to refresh user';
      set({ error: message, isLoading: false });
    }
  },
}));
