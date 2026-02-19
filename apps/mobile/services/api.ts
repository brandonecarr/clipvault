import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import type { ApiResponse } from '@clipvault/shared';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

export const ACCESS_TOKEN_KEY = 'clipvault_access_token';
export const REFRESH_TOKEN_KEY = 'clipvault_refresh_token';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: `${API_URL}/api/v1`,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach auth token
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle 401 / token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
        if (!refreshToken) throw new Error('No refresh token');

        const response = await axios.post(`${API_URL}/api/v1/auth/refresh`, { refreshToken });
        const { session } = response.data.data;

        await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, session.accessToken);
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, session.refreshToken);

        // Retry original request with new token
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${session.accessToken}`;
        }
        return api(originalRequest);
      } catch {
        // Refresh failed — clear tokens (auth store will handle redirect)
        await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
        await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);

// Helper to unwrap API response
export async function apiRequest<T>(
  request: Promise<{ data: ApiResponse<T> }>,
): Promise<T> {
  const response = await request;
  const { data: result } = response;

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data;
}

export default api;
