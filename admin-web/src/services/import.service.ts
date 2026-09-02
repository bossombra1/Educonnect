import apiClient from './api';
import type { ApiResponse, ImportResult } from '@/types';

export const importService = {
  async importStudents(file: File): Promise<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await apiClient.post<ApiResponse<ImportResult>>('/imports/students', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data;
  },

  async getImportHistory(): Promise<ImportResult[]> {
    const { data } = await apiClient.get<ApiResponse<ImportResult[]>>('/imports/history');
    return data.data;
  },
};
