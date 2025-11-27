import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/api';
import { User } from '../utils/types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  canEditContent: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Initialiser directement depuis localStorage pour éviter le problème de timing
  const getInitialToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  };

  const getInitialUser = (): User | null => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          return JSON.parse(storedUser);
        } catch (e) {
          return null;
        }
      }
    }
    return null;
  };

  const [user, setUser] = useState<User | null>(getInitialUser());
  const [token, setToken] = useState<string | null>(getInitialToken());
  const [isInitialized, setIsInitialized] = useState(false);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }, []);

  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
    const storedToken = localStorage.getItem('token');
      if (!storedToken) {
        if (isMounted) {
          setIsInitialized(true);
        }
        return;
      }

      setToken(storedToken);
      const storedUserData = getInitialUser();
      if (storedUserData && isMounted) {
        setUser(storedUserData);
      }

      try {
        const profile = await authService.getProfile();
        if (isMounted) {
          setUser(profile);
          localStorage.setItem('user', JSON.stringify(profile));
    }
      } catch (error) {
        console.error('Unable to refresh profile', error);
        if (isMounted) {
          logout();
        }
      } finally {
        if (isMounted) {
    setIsInitialized(true);
        }
      }
    };

    initialize();

    return () => {
      isMounted = false;
    };
  }, [logout]);

  const login = async (email: string, password: string) => {
    const response = await authService.login(email, password);
    setToken(response.access_token);
    setUser(response.user);
    localStorage.setItem('token', response.access_token);
    localStorage.setItem('user', JSON.stringify(response.user));
  };

  const register = async (email: string, password: string) => {
    const response = await authService.register(email, password);
    setToken(response.access_token);
    setUser(response.user);
    localStorage.setItem('token', response.access_token);
    localStorage.setItem('user', JSON.stringify(response.user));
  };

  const canEditContent = user?.role === 'MANAGER' || user?.role === 'ADMIN';
  const isAdmin = user?.role === 'ADMIN';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isInitialized,
        login,
        register,
        logout,
        canEditContent,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

