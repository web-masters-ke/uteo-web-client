'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, LoginPayload, RegisterPayload, AuthResponse } from './types';
import { authService } from './services/auth';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('skillsasa-client-token');
    const storedUser = localStorage.getItem('uteo-user');
    if (token && storedUser) {
      try { setUser(JSON.parse(storedUser)); } catch { localStorage.removeItem('skillsasa-client-token'); localStorage.removeItem('uteo-user'); }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    const data = await authService.login(payload.email, payload.password);
    localStorage.setItem('skillsasa-client-token', data.accessToken);
    localStorage.setItem('uteo-user', JSON.stringify(data.user));
    setUser(data.user);
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const data = await authService.register(payload);
    localStorage.setItem('skillsasa-client-token', data.accessToken);
    localStorage.setItem('uteo-user', JSON.stringify(data.user));
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    try {
      localStorage.removeItem('skillsasa-client-token');
      localStorage.removeItem('uteo-user');
      localStorage.removeItem('uteo-refresh-token');
      sessionStorage.clear();
    } catch { /* noop */ }
    setUser(null);
    if (typeof window !== 'undefined') window.location.replace('/login');
  }, []);

  const updateUser = useCallback((updated: User) => {
    localStorage.setItem('uteo-user', JSON.stringify(updated));
    setUser(updated);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
