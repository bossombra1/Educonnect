import { useState, useEffect, useCallback } from 'react';
import { router } from 'expo-router';
import authService from '@/services/auth.service';
import type { User } from '@/types';

interface UseAuthReturn {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (matricule: string, phone: string) => Promise<void>;
  verifyOtp: (matricule: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      const token = await authService.getStoredToken();
      if (token) {
        const storedUser = await authService.getStoredUser();
        if (storedUser) {
          setUser(storedUser);
          setIsAuthenticated(true);
        }
      }
    } catch {
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (matricule: string, phone: string) => {
    await authService.requestOtp(matricule, phone);
  }, []);

  const verifyOtp = useCallback(async (matricule: string, code: string) => {
    const response = await authService.verifyOtp(matricule, code);
    setUser(response.user);
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
    setIsAuthenticated(false);
    router.replace('/auth/login');
  }, []);

  return { user, isLoading, isAuthenticated, login, verifyOtp, logout };
}

export default useAuth;
