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

  async downloadStudentsTemplate(): Promise<void> {
    const { data } = await apiClient.get<Blob>('/imports/students/template', {
      responseType: 'blob',
    });

    const url = window.URL.createObjectURL(data);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'modele_import_eleves.xlsx';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
  },

  async getImportHistory(): Promise<ImportResult[]> {
    const { data } = await apiClient.get<ApiResponse<ImportResult[]>>('/imports/history');
    return data.data;
  },
};
