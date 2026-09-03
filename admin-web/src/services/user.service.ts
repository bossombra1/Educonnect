import apiClient from './api';
import type { ApiResponse, PaginatedResponse, User, UserRole } from '@/types';

interface UserParams { page?: number; limit?: number; role?: UserRole; classId?: string; search?: string; isActive?: boolean; }
type ApiUser = Record<string, any>;

function normalizeUser(raw: ApiUser): User {
  return {
    ...raw,
    id: String(raw.id),
    firstName: raw.firstName ?? raw.first_name ?? '',
    lastName: raw.lastName ?? raw.last_name ?? '',
    email: raw.email ?? '',
    phone: raw.phone ?? undefined,
    role: (raw.role ?? raw.role_name ?? 'STAFF') as UserRole,
    isActive: raw.isActive ?? Boolean(raw.is_active),
    createdAt: raw.createdAt ?? raw.created_at ?? undefined,
    updatedAt: raw.updatedAt ?? raw.updated_at ?? undefined,
    matricule: raw.matricule ?? undefined,
    matriculeScolaire: raw.matriculeScolaire ?? raw.matricule_scolaire ?? undefined,
    classId: raw.classId ?? (raw.class_id != null ? String(raw.class_id) : undefined),
    className: raw.className ?? raw.class_name ?? undefined,
    studentStatus: raw.studentStatus ?? raw.student_status ?? undefined,
    roleTitle: raw.roleTitle ?? raw.role_title ?? undefined,
    department: raw.department ?? raw.department_name ?? raw.departement ?? undefined,
  } as User;
}

function toApiPayload(input: Record<string, any>): Record<string, any> {
  const payload = { ...input };
  if (payload.firstName !== undefined) { payload.first_name = payload.firstName; delete payload.firstName; }
  if (payload.lastName !== undefined) { payload.last_name = payload.lastName; delete payload.lastName; }
  if (payload.isActive !== undefined) { payload.is_active = payload.isActive; delete payload.isActive; }
  if (payload.classId !== undefined) { payload.class_id = payload.classId; delete payload.classId; }
  if (payload.roleId !== undefined) { payload.role_id = payload.roleId; delete payload.roleId; }
  if (payload.role !== undefined && payload.role_id === undefined) payload.role = String(payload.role).toUpperCase();
  return payload;
}

export const userService = {
  async getUsers(params: UserParams = {}): Promise<PaginatedResponse<User>> { const { data } = await apiClient.get<PaginatedResponse<ApiUser>>('/users', { params }); return { ...data, data: data.data.map(normalizeUser) } as PaginatedResponse<User>; },
  async getUser(id: string): Promise<User> { const { data } = await apiClient.get<ApiResponse<ApiUser>>(`/users/${id}`); return normalizeUser(data.data); },
  async getStudentsByParent(parentId: string): Promise<User[]> { const { data } = await apiClient.get<ApiResponse<ApiUser[]>>(`/users/students/by-parent/${parentId}`); return data.data.map(normalizeUser); },
  async createUser(userData: Partial<User> & { password: string }): Promise<User> { const { data } = await apiClient.post<ApiResponse<ApiUser>>('/users', toApiPayload(userData as Record<string, any>)); return normalizeUser(data.data); },
  async updateUser(id: string, userData: Partial<User>): Promise<User> { const { data } = await apiClient.put<ApiResponse<ApiUser>>(`/users/${id}`, toApiPayload(userData as Record<string, any>)); return normalizeUser(data.data); },
  async deleteUser(id: string): Promise<void> { await apiClient.delete(`/users/${id}`); },
  async searchUsers(query: string): Promise<User[]> { const { data } = await apiClient.get<ApiResponse<ApiUser[]>>('/users/search', { params: { q: query } }); return data.data.map(normalizeUser); },
};
