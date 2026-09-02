import apiClient from './api';
import * as SecureStore from 'expo-secure-store';
import type { User, OtpRequest, OtpVerifyRequest, OtpResponse, ApiResponse } from '@/types';

type BackendUser = {
  id: number | string;
  matricule: string;
  first_name?: string | null;
  last_name?: string | null;
  role?: 'PARENT' | 'STUDENT' | 'STAFF' | 'ADMIN' | 'SUPER_ADMIN' | string;
  role_name?: 'PARENT' | 'STUDENT' | 'STAFF' | 'ADMIN' | 'SUPER_ADMIN' | string;
  establishment_id: number | string | null;
  phone?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  establishment_name?: string | null;
  created_at?: string | null;
  children?: Array<Record<string, unknown>>;
};

function normalizeUser(user: BackendUser): User {
  const firstName = user.first_name?.trim() ?? '';
  const lastName = user.last_name?.trim() ?? '';
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
  const backendRole = user.role ?? user.role_name ?? '';
  const roleMap: Record<string, User['role']> = {
    PARENT: 'parent', STUDENT: 'student', STAFF: 'staff', ADMIN: 'admin', SUPER_ADMIN: 'admin',
  };

  return {
    id: String(user.id),
    matricule: user.matricule,
    phone: user.phone ?? '',
    full_name: fullName || user.matricule,
    role: roleMap[backendRole] ?? 'staff',
    ...(user.email ? { email: user.email } : {}),
    ...(user.avatar_url ? { avatar_url: user.avatar_url } : {}),
    establishment_id: user.establishment_id === null ? '' : String(user.establishment_id),
    ...(user.establishment_name ? { establishment_name: user.establishment_name } : {}),
    created_at: user.created_at ?? new Date().toISOString(),
  };
}

class AuthService {
  async requestOtp(request: OtpRequest): Promise<ApiResponse<{ message: string; requiresChildMatricule?: boolean }>> {
    const { data } = await apiClient.post<ApiResponse<{ message: string; requiresChildMatricule?: boolean }>>(
      '/auth/otp/request', request,
    );
    return data;
  }

  async verifyOtp(request: OtpVerifyRequest): Promise<OtpResponse> {
    const { data } = await apiClient.post<ApiResponse<{ token: string; user: BackendUser }>>(
      '/auth/otp/verify', request,
    );
    const response: OtpResponse = { token: data.data.token, user: normalizeUser(data.data.user) };
    await SecureStore.setItemAsync('auth_token', response.token);
    await SecureStore.setItemAsync('auth_user', JSON.stringify(response.user));
    return response;
  }

  async getProfile(): Promise<User> {
    const { data } = await apiClient.get<ApiResponse<BackendUser>>('/auth/profile');
    const user = normalizeUser(data.data);
    await SecureStore.setItemAsync('auth_user', JSON.stringify(user));
    return user;
  }

  async logout(): Promise<void> {
    try { await apiClient.post('/auth/logout'); } catch { /* network errors are non-blocking */ }
    finally {
      await SecureStore.deleteItemAsync('auth_token');
      await SecureStore.deleteItemAsync('auth_user');
    }
  }

  async getStoredUser(): Promise<User | null> {
    try {
      const raw = await SecureStore.getItemAsync('auth_user');
      return raw ? JSON.parse(raw) as User : null;
    } catch { return null; }
  }

  async getStoredToken(): Promise<string | null> { return SecureStore.getItemAsync('auth_token'); }
  async isAuthenticated(): Promise<boolean> { return !!(await this.getStoredToken()); }
}

export const authService = new AuthService();
export default authService;
