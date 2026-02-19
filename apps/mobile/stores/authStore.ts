import { create } from 'zustand';
import type { User, AuthSession } from '@clipvault/shared';

interface AuthState {
  user: User | null;
  session: AuthSession | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  setUser: (user: User | null) => void;
  setSession: (session: AuthSession | null) => void;
  setLoading: (loading: boolean) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) => set({ user }),
  setSession: (session) =>
    set({
      session,
      isAuthenticated: session !== null,
    }),
  setLoading: (isLoading) => set({ isLoading }),
  signOut: () =>
    set({
      user: null,
      session: null,
      isAuthenticated: false,
    }),
}));
