import apiClient from './api';
import type { ApiResponse, LoginResponse, User, UserRole } from '@/types';

type BackendUser = {
  id: number | string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  matricule?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  role: UserRole;
  establishment_id?: number | string | null;
  establishment_name?: string | null;
  is_active?: number | boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
  last_login_at?: string | null;
};

function normalizeUser(user: BackendUser): User {
  return {
    id: String(user.id),
    email: user.email ?? '',
    firstName: user.first_name ?? '',
    lastName: user.last_name ?? '',
    role: user.role,
    ...(user.phone ? { phone: user.phone } : {}),
    isActive: Boolean(user.is_active),
    createdAt: user.created_at ?? new Date(0).toISOString(),
    updatedAt: user.updated_at ?? user.created_at ?? new Date(0).toISOString(),
    ...(user.last_login_at ? { lastLogin: user.last_login_at } : {}),
  };
}

export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const { data } = await apiClient.post<ApiResponse<{ token: string; user: BackendUser }>>(
      '/auth/login',
      { email, password }
    );

    const response: LoginResponse = {
      token: data.data.token,
      user: normalizeUser(data.data.user),
    };

    localStorage.setItem('token', response.token);
    localStorage.setItem('user', JSON.stringify(response.user));
    return response;
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  },

  async getProfile(): Promise<User> {
    const { data } = await apiClient.get<ApiResponse<BackendUser>>('/auth/profile');
    const user = normalizeUser(data.data);
    localStorage.setItem('user', JSON.stringify(user));
    return user;
  },
};