import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService, type AuthUser } from '../services/authService';
import type { UserRole } from '../types/database';

export type { UserRole };

export interface User {
  id: string;     // Always a real Supabase auth.users UUID
  email: string;
  name: string;
  role: UserRole;
  avatar: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function toUser(auth: AuthUser): User {
  return { id: auth.id, email: auth.email, name: auth.name, role: auth.role, avatar: auth.initials };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authService.getSession().then(auth => {
      setUser(auth ? toUser(auth) : null);
      setLoading(false);
    });

    const { data: { subscription } } = authService.onAuthStateChange(auth => {
      setUser(auth ? toUser(auth) : null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const { data, error } = await authService.signIn(email, password);
    if (error || !data) return { success: false, message: error ?? 'Login gagal.' };
    setUser(toUser(data));
    return { success: true };
  };

  const logout = async () => {
    await authService.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
