import * as SecureStore from 'expo-secure-store';
import api, { apiRequest, ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from './api.js';
import type { User, AuthSession } from '@clipvault/shared';

interface AuthResponse {
  user: User;
  session: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
  } | null;
}

async function persistSession(session: AuthResponse['session']) {
  if (!session) return;
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, session.accessToken);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, session.refreshToken);
}

export const authService = {
  async signup(email: string, password: string, displayName?: string): Promise<AuthResponse> {
    const result = await apiRequest<AuthResponse>(
      api.post('/auth/signup', { email, password, displayName }),
    );
    await persistSession(result.session);
    return result;
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const result = await apiRequest<AuthResponse>(
      api.post('/auth/login', { email, password }),
    );
    await persistSession(result.session);
    return result;
  },

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } finally {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    }
  },

  async getMe(): Promise<User> {
    const result = await apiRequest<{ user: User }>(api.get('/auth/me'));
    return result.user;
  },

  async getStoredToken(): Promise<string | null> {
    return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  },

  async hasStoredSession(): Promise<boolean> {
    const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    return token !== null;
  },
};
