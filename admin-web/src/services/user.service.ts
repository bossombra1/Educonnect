import apiClient from './api';
import type { ApiResponse, PaginatedResponse, User, UserRole } from '@/types';

interface UserParams {
  page?: number;
  limit?: number;
  role?: UserRole;
  classId?: string;
  search?: string;
  isActive?: boolean;
}

export const userService = {
  async getUsers(params: UserParams = {}): Promise<PaginatedResponse<User>> {
    const { data } = await apiClient.get<PaginatedResponse<User>>('/users', { params });
    return data;
  },

  async getUser(id: string): Promise<User> {
    const { data } = await apiClient.get<ApiResponse<User>>(`/users/${id}`);
    return data.data;
  },

  async createUser(userData: Partial<User> & { password: string }): Promise<User> {
    const { data } = await apiClient.post<ApiResponse<User>>('/users', userData);
    return data.data;
  },

  async updateUser(id: string, userData: Partial<User>): Promise<User> {
    const { data } = await apiClient.put<ApiResponse<User>>(`/users/${id}`, userData);
    return data.data;
  },

  async deleteUser(id: string): Promise<void> {
    await apiClient.delete(`/users/${id}`);
  },

  async searchUsers(query: string): Promise<User[]> {
    const { data } = await apiClient.get<ApiResponse<User[]>>('/users/search', { params: { q: query } });
    return data.data;
  },
};
