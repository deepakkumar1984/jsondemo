import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from './api';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('hrm_token'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (token) {
      api.setToken(token);
      api.get<{ success: boolean; data: User }>('/auth/me')
        .then(res => { setUser(res.data); })
        .catch(() => { setToken(null); localStorage.removeItem('hrm_token'); api.setToken(null); })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<{ success: boolean; data: { token: string; user: User } }>('/auth/login', { email, password });
    const { token: newToken, user: userData } = res.data;
    localStorage.setItem('hrm_token', newToken);
    api.setToken(newToken);
    setToken(newToken);
    setUser(userData);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    // First register the user
    await api.post<{ success: boolean; data: { id: string; email: string; name: string; role: string } }>('/auth/register', { name, email, password });
    // Then log them in automatically
    await login(email, password);
  }, [login]);

  const logout = useCallback(() => {
    localStorage.removeItem('hrm_token');
    api.setToken(null);
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, isLoading, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
