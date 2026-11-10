import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Role } from '../types/index.ts';
import { api } from '../services/api.ts';

interface AuthContextType {
  user: User | null;
  token: string | null;
  role: Role;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isComplianceOfficer: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (data: { email: string; password: string; firstName: string; lastName: string; phone?: string }) => Promise<void>;
  logout: () => void;
  switchPersona: (persona: 'user' | 'admin' | 'compliance') => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('bv_auth_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    try {
      const data = await api.auth.me();
      setUser(data.user);
    } catch {
      localStorage.removeItem('bv_auth_token');
      setToken(null);
      setUser(null);
      // Auto-recover session with default demo user so app is never in an unauthenticated broken state
      try {
        const demoRes = await api.auth.login({
          email: 'akankshakondi4@gmail.com',
          password: 'User123!',
        });
        localStorage.setItem('bv_auth_token', demoRes.token);
        setToken(demoRes.token);
        setUser(demoRes.user);
      } catch (e) {
        console.error('Failed to auto-recover session:', e);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('bv_auth_token');
      if (storedToken) {
        try {
          const data = await api.auth.me();
          // If stored session belongs to previous deleted user, refresh with Kondi Akanksha
          if (data.user?.email === 'alex.morgan@balancevault.com') {
            await refreshUser();
          } else {
            setUser(data.user);
            setIsLoading(false);
          }
        } catch {
          await refreshUser();
        }
      } else {
        // Auto sign-in as default Demo User (Kondi Akanksha) on first visit
        try {
          const demoRes = await api.auth.login({
            email: 'akankshakondi4@gmail.com',
            password: 'User123!',
          });
          localStorage.setItem('bv_auth_token', demoRes.token);
          setToken(demoRes.token);
          setUser(demoRes.user);
        } catch (e) {
          console.error('Initial login error:', e);
        } finally {
          setIsLoading(false);
        }
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const data = await api.auth.login({ email, password: pass });
      localStorage.setItem('bv_auth_token', data.token);
      setToken(data.token);
      setUser(data.user);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: { email: string; password: string; firstName: string; lastName: string; phone?: string }) => {
    setIsLoading(true);
    try {
      const res = await api.auth.register(data);
      localStorage.setItem('bv_auth_token', res.token);
      setToken(res.token);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('bv_auth_token');
    setToken(null);
    setUser(null);
  };

  const switchPersona = async (persona: 'user' | 'admin' | 'compliance') => {
    if (persona === 'admin') {
      await login('admin@balancevault.com', 'Admin123!');
    } else {
      await login('akankshakondi4@gmail.com', 'User123!');
    }
  };

  const role = user?.role || 'USER';
  const isAdmin = role === 'ADMIN';
  const isComplianceOfficer = role === 'COMPLIANCE_OFFICER';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role,
        isAuthenticated: !!user,
        isAdmin,
        isComplianceOfficer,
        isLoading,
        login,
        register,
        logout,
        switchPersona,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
