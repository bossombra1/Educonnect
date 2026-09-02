import apiClient from './api';
import type { ApiResponse, Class } from '@/types';

export const classService = {
  async getClasses(): Promise<Class[]> {
    const { data } = await apiClient.get<ApiResponse<Class[]>>('/classes');
    return data.data;
  },

  async createClass(classData: Partial<Class>): Promise<Class> {
    const { data } = await apiClient.post<ApiResponse<Class>>('/classes', classData);
    return data.data;
  },

  async updateClass(id: string, classData: Partial<Class>): Promise<Class> {
    const { data } = await apiClient.put<ApiResponse<Class>>(`/classes/${id}`, classData);
    return data.data;
  },

  async deleteClass(id: string): Promise<void> {
    await apiClient.delete(`/classes/${id}`);
  },
};
