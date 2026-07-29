import axios, { type AxiosInstance, type AxiosError } from 'axios';
import { API_BASE_URL } from '../config/env';
import { tokenStorage } from './storage';

let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
});

api.interceptors.request.use(async (config) => {
  const token = await tokenStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (typeof error.config & { _retried?: boolean }) | undefined;
    if (error.response?.status === 401 && original && !original._retried) {
      original._retried = true;
      const refreshToken = await tokenStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
          const data = (res.data as { data?: { accessToken?: string; refreshToken?: string } }).data;
          if (data?.accessToken) {
            await tokenStorage.setItem('accessToken', data.accessToken);
            if (data.refreshToken) await tokenStorage.setItem('refreshToken', data.refreshToken);
            (original.headers as { set?: (k: string, v: string) => void } | undefined)?.set?.('Authorization', `Bearer ${data.accessToken}`);
            return api(original);
          }
        } catch {
          await tokenStorage.deleteItem('accessToken');
          await tokenStorage.deleteItem('refreshToken');
          onUnauthorized?.();
        }
      } else {
        onUnauthorized?.();
      }
    }
    return Promise.reject(error);
  },
);

export interface ApiEnvelope<T> {
  success: true;
  data: T;
}

export interface ApiPaginated<T> {
  success: true;
  data: T[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

export function errorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const body = err.response?.data as { message?: string; error?: string } | undefined;
    return body?.message ?? body?.error ?? err.message;
  }
  return err instanceof Error ? err.message : 'unknown error';
}
