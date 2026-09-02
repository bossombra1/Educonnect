import apiClient from './api';
import * as SecureStore from 'expo-secure-store';
import type { User, LoginRequest, OtpRequest, OtpResponse, ApiResponse } from '@/types';

class AuthService {
  async requestOtp(matricule: string, phone: string): Promise<ApiResponse<{ message: string }>> {
    const payload: LoginRequest = { matricule, phone };
    const { data } = await apiClient.post<ApiResponse<{ message: string }>>('/api/auth/otp/request', payload);
    return data;
  }

  async verifyOtp(matricule: string, code: string): Promise<OtpResponse> {
    const payload: OtpRequest = { matricule, code };
    const { data } = await apiClient.post<ApiResponse<OtpResponse>>('/api/auth/otp/verify', payload);
    await SecureStore.setItemAsync('auth_token', data.data.token);
    await SecureStore.setItemAsync('auth_user', JSON.stringify(data.data.user));
    return data.data;
  }

  async getProfile(): Promise<User> {
    const { data } = await apiClient.get<ApiResponse<User>>('/api/auth/profile');
    const user = data.data;
    await SecureStore.setItemAsync('auth_user', JSON.stringify(user));
    return user;
  }

  async logout(): Promise<void> {
    try {
      await apiClient.post('/api/auth/logout');
    } catch {
      // Ignorer les erreurs réseau lors de la déconnexion
    } finally {
      await SecureStore.deleteItemAsync('auth_token');
      await SecureStore.deleteItemAsync('auth_user');
    }
  }

  async getStoredUser(): Promise<User | null> {
    try {
      const raw = await SecureStore.getItemAsync('auth_user');
      if (raw) {
        return JSON.parse(raw) as User;
      }
    } catch {
      // Données corrompues
    }
    return null;
  }

  async getStoredToken(): Promise<string | null> {
    return SecureStore.getItemAsync('auth_token');
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await this.getStoredToken();
    return !!token;
  }
}

export const authService = new AuthService();
export default authService;
