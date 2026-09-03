import apiClient from './api';
import type { ApiResponse, Group, CreateGroupForm, User } from '@/types';

function normalizeGroup(raw: any): Group {
  return {
    id: String(raw.id),
    name: raw.name || '',
    type: raw.type || raw.group_type || 'custom',
    description: raw.description || undefined,
    filters: raw.filters || undefined,
    memberCount: Number(raw.memberCount ?? raw.member_count ?? 0),
    createdAt: raw.createdAt || raw.created_at || '',
    updatedAt: raw.updatedAt || raw.updated_at || '',
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
    const { data } = await apiClient.post<ApiResponse<any>>('/groups', groupData);
    return normalizeGroup(data.data);
  },

  async updateGroup(id: string, groupData: Partial<CreateGroupForm>): Promise<Group> {
    const { data } = await apiClient.put<ApiResponse<any>>(`/groups/${id}`, groupData);
    return normalizeGroup(data.data);
  },

  async deleteGroup(id: string): Promise<void> {
    await apiClient.delete(`/groups/${id}`);
  },

  async getGroupMembers(id: string): Promise<User[]> {
    const { data } = await apiClient.get<ApiResponse<User[]>>(`/groups/${id}/members`);
    return data.data;
  },
};
