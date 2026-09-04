import apiClient from './api';
import type { ApiResponse, Class } from '@/types';

function normalizeClass(raw: any): Class {
  return {
    id: String(raw.id),
    name: raw.name || '',
    level: raw.level || '',
    section: raw.section || undefined,
    capacity: Number(raw.capacity ?? 0),
    studentCount: Number(raw.studentCount ?? raw.student_count ?? 0),
    schoolYear: raw.schoolYear || raw.school_year || '',
    createdAt: raw.createdAt || raw.created_at || '',
    updatedAt: raw.updatedAt || raw.updated_at || '',
  };
}

function toApiPayload(classData: Partial<Class>) {
  return {
    name: classData.name,
    level: classData.level,
    section: classData.section || null,
    capacity: classData.capacity,
    school_year: classData.schoolYear,
  };
}

export const classService = {
  async getClasses(schoolYear?: string): Promise<Class[]> {
    const params = schoolYear ? { school_year: schoolYear } : undefined;
    const { data } = await apiClient.get<ApiResponse<any[]>>('/classes', { params });
    return (data.data || []).map(normalizeClass);
  },

  async createClass(classData: Partial<Class>): Promise<Class> {
    const { data } = await apiClient.post<ApiResponse<any>>('/classes', toApiPayload(classData));
    return normalizeClass(data.data);
  },

  async updateClass(id: string, classData: Partial<Class>): Promise<Class> {
    const { data } = await apiClient.put<ApiResponse<any>>(`/classes/${id}`, toApiPayload(classData));
    return normalizeClass(data.data);
  },

  async deleteClass(id: string): Promise<void> {
    await apiClient.delete(`/classes/${id}`);
  },
};
