import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  getCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
  type User,
} from './session';
import { registerPushToken } from '../push/register';

type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

type AuthState = {
  user: User | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  const refresh = async () => {
    const u = await getCurrentUser();
    setUser(u);
    setStatus(u ? 'authenticated' : 'anonymous');
  };

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (status !== 'authenticated' || !user) {
      return;
    }

    registerPushToken().catch((error) => {
      console.warn('[push] falha ao registrar o token no login/restauração de sessão.', error);
    });
  }, [status, user?.id]);

  const login: AuthState['login'] = async (email, password) => {
    const u = await loginRequest(email, password);
    setUser(u);
    setStatus('authenticated');
  };

  const logout: AuthState['logout'] = async () => {
    await logoutRequest();
    setUser(null);
    setStatus('anonymous');
  };

  return (
    <AuthContext.Provider value={{ user, status, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve estar dentro de <AuthProvider>');
  return ctx;
}
