import { useState, useEffect, useCallback } from 'react';
import { router } from 'expo-router';
import authService from '@/services/auth.service';
import type { OtpRequest, OtpVerifyRequest, User } from '@/types';

interface UseAuthReturn {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (request: OtpRequest) => Promise<void>;
  verifyOtp: (request: OtpVerifyRequest) => Promise<void>;
  logout: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const checkAuth = useCallback(async () => {
    try {
      const token = await authService.getStoredToken();
      if (!token) return;

      const storedUser = await authService.getStoredUser();
      if (storedUser) {
        setUser(storedUser);
        setIsAuthenticated(true);
      }
    } catch {
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  const login = useCallback(async (request: OtpRequest) => {
    await authService.requestOtp(request);
  }, []);

  const verifyOtp = useCallback(async (request: OtpVerifyRequest) => {
    const response = await authService.verifyOtp(request);
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
