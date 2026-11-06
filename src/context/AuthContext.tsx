import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AdminUser } from '../types/index.ts';

export const AUTHORIZED_ADMIN_USERNAME = 'admin';
export const AUTHORIZED_ADMIN_EMAIL = 'hillssinaitab20@gmail.com';

interface AccessDeniedState {
  attemptedEmail: string;
  reason: string;
}

interface AuthContextType {
  user: AdminUser | null;
  idToken: string | null;
  isAuthorized: boolean;
  isLoading: boolean;
  sessionExpired: boolean;
  accessDenied: AccessDeniedState | null;
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  loginDemoAdmin: () => void;
  logout: () => Promise<void>;
  clearAccessDenied: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [sessionExpired, setSessionExpired] = useState<boolean>(false);
  const [accessDenied, setAccessDenied] = useState<AccessDeniedState | null>(null);

  // Validate existing stored token on mount
  const checkSession = useCallback(async () => {
    setIsLoading(true);
    const storedToken = localStorage.getItem('acc_admin_token');

    // Check demo preview storage
    const demoStored = sessionStorage.getItem('acc_demo_admin_active');
    if (demoStored === 'true') {
      const demoUser: AdminUser = {
        uid: 'admin-demo-uid',
        username: AUTHORIZED_ADMIN_USERNAME,
        email: AUTHORIZED_ADMIN_EMAIL,
        emailVerified: true,
        displayName: 'Command Administrator',
        photoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=128&auto=format&fit=crop&q=80',
        role: 'admin',
      };
      setUser(demoUser);
      setIdToken('demo-admin-mock-bearer-token');
      setIsLoading(false);
      return;
    }

    if (!storedToken) {
      setUser(null);
      setIdToken(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/admin/me', {
        headers: {
          Authorization: `Bearer ${storedToken}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.admin);
        setIdToken(storedToken);
        setSessionExpired(false);
      } else {
        const err = await res.json().catch(() => ({}));
        if (err.error === 'SESSION_EXPIRED') {
          setSessionExpired(true);
        }
        localStorage.removeItem('acc_admin_token');
        setUser(null);
        setIdToken(null);
      }
    } catch {
      // offline or network error: keep token or set null
      setUser(null);
      setIdToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const login = useCallback(async (username: string, password: string): Promise<{ success: boolean; message?: string }> => {
    setIsLoading(true);
    setSessionExpired(false);
    setAccessDenied(null);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        localStorage.setItem('acc_admin_token', data.token);
        sessionStorage.removeItem('acc_demo_admin_active');
        setUser(data.admin);
        setIdToken(data.token);
        setIsLoading(false);
        return { success: true };
      } else {
        setIsLoading(false);
        return {
          success: false,
          message: data.message || 'Invalid administrator username or password.',
        };
      }
    } catch (err: any) {
      setIsLoading(false);
      return {
        success: false,
        message: err.message || 'Network error while contacting authentication server.',
      };
    }
  }, []);

  const loginDemoAdmin = useCallback(() => {
    const demoUser: AdminUser = {
      uid: 'admin-demo-uid',
      username: AUTHORIZED_ADMIN_USERNAME,
      email: AUTHORIZED_ADMIN_EMAIL,
      emailVerified: true,
      displayName: 'Command Administrator',
      photoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=128&auto=format&fit=crop&q=80',
      role: 'admin',
    };
    setUser(demoUser);
    setIdToken('demo-admin-mock-bearer-token');
    setAccessDenied(null);
    setSessionExpired(false);
    sessionStorage.setItem('acc_demo_admin_active', 'true');
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' }).catch(() => {});
    } finally {
      localStorage.removeItem('acc_admin_token');
      sessionStorage.removeItem('acc_demo_admin_active');
      setUser(null);
      setIdToken(null);
    }
  }, []);

  const clearAccessDenied = useCallback(() => {
    setAccessDenied(null);
  }, []);

  const isAuthorized = !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        idToken,
        isAuthorized,
        isLoading,
        sessionExpired,
        accessDenied,
        login,
        loginDemoAdmin,
        logout,
        clearAccessDenied,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
