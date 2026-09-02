import apiClient from './api';
import * as SecureStore from 'expo-secure-store';
import type { User, OtpRequest, OtpResponse, ApiResponse } from '@/types';

type BackendOtpUser = {
  id: number | string;
  matricule: string;
  first_name?: string | null;
  last_name?: string | null;
  role: 'PARENT' | 'STUDENT' | 'STAFF' | string;
  establishment_id: number | string | null;
  phone?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  establishment_name?: string | null;
  created_at?: string;
};

function normalizeOtpUser(user: BackendOtpUser): User {
  const firstName = user.first_name?.trim() ?? '';
  const lastName = user.last_name?.trim() ?? '';
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();

  const roleMap: Record<string, User['role']> = {
    PARENT: 'parent',
    STUDENT: 'student',
    STAFF: 'staff',
    ADMIN: 'admin',
    SUPER_ADMIN: 'admin',
  };

  return {
    id: String(user.id),
    matricule: user.matricule,
    phone: user.phone ?? '',
    full_name: fullName || user.matricule,
    role: roleMap[user.role] ?? 'staff',
    ...(user.email ? { email: user.email } : {}),
    ...(user.avatar_url ? { avatar_url: user.avatar_url } : {}),
    establishment_id: user.establishment_id === null ? '' : String(user.establishment_id),
    ...(user.establishment_name ? { establishment_name: user.establishment_name } : {}),
    created_at: user.created_at ?? new Date().toISOString(),
  };
}

class AuthService {
  async requestOtp(matricule: string, phone: string): Promise<ApiResponse<{ message: string }>> {
    const payload = { matricule, phone };
    const { data } = await apiClient.post<ApiResponse<{ message: string }>>('/auth/otp/request', payload);
    return data;
  }

  async verifyOtp(matricule: string, code: string): Promise<OtpResponse> {
    const payload: OtpRequest = { matricule, code };
    const { data } = await apiClient.post<ApiResponse<{ token: string; user: BackendOtpUser }>>('/auth/otp/verify', payload);
    const normalizedUser = normalizeOtpUser(data.data.user);
    const response: OtpResponse = { token: data.data.token, user: normalizedUser };

    await SecureStore.setItemAsync('auth_token', response.token);
    await SecureStore.setItemAsync('auth_user', JSON.stringify(response.user));
    return response;
  }

  async getProfile(): Promise<User> {
    const { data } = await apiClient.get<ApiResponse<User>>('/auth/profile');
    const user = data.data;
    await SecureStore.setItemAsync('auth_user', JSON.stringify(user));
    return user;
  }

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
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
