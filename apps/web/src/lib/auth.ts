import { authApi } from './api';

export const isAuthenticated = (): boolean => {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem('access_token');
};

export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
};

export const checkAuth = async (): Promise<boolean> => {
  if (!isAuthenticated()) return false;
  try {
    await authApi.getMe();
    return true;
  } catch {
    authApi.logout();
    return false;
  }
};

