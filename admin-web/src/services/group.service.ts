import apiClient from './api';
import type { ApiResponse, Group, CreateGroupForm, GroupMember, PaginatedResponse } from '@/types';

function normalizeGroup(raw: any): Group {
  return {
    id: String(raw.id),
    name: raw.name || '',
    type: raw.type || raw.group_type || 'custom',
    description: raw.description || undefined,
    filters: raw.filters || undefined,
    memberCount: Number(raw.memberCount ?? raw.member_count ?? 0),
    establishmentId: raw.establishmentId != null ? String(raw.establishmentId) : raw.establishment_id != null ? String(raw.establishment_id) : undefined,
    establishmentName: raw.establishmentName || raw.establishment_name || undefined,
    createdAt: raw.createdAt || raw.created_at || '',
    updatedAt: raw.updatedAt || raw.updated_at || '',
  };
}

function normalizeGroupPayload(groupData: CreateGroupForm | Partial<CreateGroupForm>): any {
  const { type, ...rest } = groupData;
  return { ...rest, group_type: type };
}

function normalizeMember(raw: any): GroupMember {
  return {
    id: String(raw.id),
    firstName: raw.firstName || raw.first_name || '',
    lastName: raw.lastName || raw.last_name || '',
    matricule: raw.matricule || undefined,
    phone: raw.phone || undefined,
    role: raw.role || raw.role_name || undefined,
    schoolMatricule: raw.schoolMatricule || raw.matricule_scolaire || undefined,
    studentStatus: raw.studentStatus || raw.student_status || undefined,
    classId: raw.classId != null ? String(raw.classId) : raw.class_id != null ? String(raw.class_id) : undefined,
    className: raw.className || raw.class_name || undefined,
    classLevel: raw.classLevel || raw.class_level || undefined,
    classSection: raw.classSection || raw.class_section || undefined,
    establishmentId: raw.establishmentId != null ? String(raw.establishmentId) : raw.establishment_id != null ? String(raw.establishment_id) : undefined,
    establishmentName: raw.establishmentName || raw.establishment_name || undefined,
  };
}

export const groupService = {
  async getGroups(): Promise<Group[]> {
    const { data } = await apiClient.get<ApiResponse<any[]>>('/groups');
    return (data.data || []).map(normalizeGroup);
  },

  async getGroup(id: string): Promise<Group> {
    const { data } = await apiClient.get<ApiResponse<any>>(`/groups/${id}`);
    return normalizeGroup(data.data);
  },

  async createGroup(groupData: CreateGroupForm): Promise<Group> {
    const { data } = await apiClient.post<ApiResponse<any>>('/groups', normalizeGroupPayload(groupData));
    return normalizeGroup(data.data);
  },

  async updateGroup(id: string, groupData: Partial<CreateGroupForm>): Promise<Group> {
    const { data } = await apiClient.put<ApiResponse<any>>(`/groups/${id}`, normalizeGroupPayload(groupData));
    return normalizeGroup(data.data);
  },

  async deleteGroup(id: string): Promise<void> {
    await apiClient.delete(`/groups/${id}`);
  },

  async getGroupMembers(id: string, page = 1, limit = 50): Promise<{ data: GroupMember[]; pagination?: PaginatedResponse<GroupMember>['pagination'] }> {
    const { data } = await apiClient.get<ApiResponse<GroupMember[]> & { pagination?: PaginatedResponse<GroupMember>['pagination'] }>(`/groups/${id}/members`, { params: { page, limit } });
    return { data: (data.data || []).map(normalizeMember), pagination: data.pagination };
  },
};
