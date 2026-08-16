import { api, ApiClientError } from '../api/client';
import { clearToken, saveToken } from './storage';
import { unregisterPushToken } from '../push/register';

export type User = {
  id: string;
  email: string;
  username: string;
  role: 'USER' | 'ADMIN';
  isActive?: boolean;
};

type AuthResponse = {
  user: User;
  token: string;
};

export async function login(email: string, password: string): Promise<User> {
  const res = await api<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
    skipAuth: true,
  });
  await saveToken(res.token);
  return res.user;
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const res = await api<{ user: User }>('/api/auth/me');
    return res.user;
  } catch (err) {
    if (err instanceof ApiClientError && err.status === 401) {
      await clearToken();
    }
    return null;
  }
}

export async function logout(): Promise<void> {
  await unregisterPushToken();
  await clearToken();
}
