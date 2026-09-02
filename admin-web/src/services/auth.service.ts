import apiClient from './api';
import type { ApiResponse, LoginRequest, LoginResponse, User } from '@/types';

export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const { data } = await apiClient.post<ApiResponse<LoginResponse>>('/auth/login', { email, password });
    localStorage.setItem('token', data.data.token);
    localStorage.setItem('user', JSON.stringify(data.data.user));
    return data.data;
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  },

  async getProfile(): Promise<User> {
    const { data } = await apiClient.get<ApiResponse<User>>('/auth/profile');
    return data.data;
  },
};
