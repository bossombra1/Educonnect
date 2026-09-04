import apiClient from './api';
import type { ApiResponse, Class, ClassStudent, PaginatedResponse } from '@/types';

function normalizeClass(raw: any): Class {
  return {
    id: String(raw.id),
    name: raw.name || '',
    level: raw.level || '',
    section: raw.section || undefined,
    capacity: Number(raw.capacity ?? 0),
    studentCount: Number(raw.studentCount ?? raw.student_count ?? 0),
    activeStudentCount: Number(raw.activeStudentCount ?? raw.active_student_count ?? raw.studentCount ?? raw.student_count ?? 0),
    schoolYear: raw.schoolYear || raw.school_year || '',
    establishmentId: raw.establishmentId || raw.establishment_id || undefined,
    establishmentName: raw.establishmentName || raw.establishment_name || undefined,
    createdAt: raw.createdAt || raw.created_at || '',
    updatedAt: raw.updatedAt || raw.updated_at || '',
  };
}

function normalizeStudent(raw: any): ClassStudent {
  return {
    id: String(raw.id),
    userId: String(raw.userId ?? raw.user_id ?? ''),
    firstName: raw.firstName || raw.first_name || '',
    lastName: raw.lastName || raw.last_name || '',
    matricule: raw.matricule || undefined,
    schoolMatricule: raw.schoolMatricule || raw.matricule_scolaire || undefined,
    phone: raw.phone || undefined,
    status: raw.status || undefined,
    admissionDate: raw.admissionDate || raw.admission_date || undefined,
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

  async getClass(id: string): Promise<Class> {
    const { data } = await apiClient.get<ApiResponse<any>>(`/classes/${id}`);
    return normalizeClass(data.data);
  },

  async getClassStudents(id: string, page = 1, limit = 20, search = '', status = ''): Promise<{ data: ClassStudent[]; pagination: PaginatedResponse<ClassStudent>['pagination'] }> {
    const params: Record<string, string | number> = { page, limit };
    if (search.trim()) params.search = search.trim();
    if (status) params.status = status;
    const { data } = await apiClient.get<PaginatedResponse<any>>(`/classes/${id}/students`, { params });
    return {
      data: (data.data || []).map(normalizeStudent),
      pagination: data.pagination,
    };
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
