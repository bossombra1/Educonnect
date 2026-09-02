import apiClient from './api';
import type { ApiResponse, Group, CreateGroupForm, User } from '@/types';

export const groupService = {
  async getGroups(): Promise<Group[]> {
    const { data } = await apiClient.get<ApiResponse<Group[]>>('/groups');
    return data.data;
  },

  async getGroup(id: string): Promise<Group> {
    const { data } = await apiClient.get<ApiResponse<Group>>(`/groups/${id}`);
    return data.data;
  },

  async createGroup(groupData: CreateGroupForm): Promise<Group> {
    const { data } = await apiClient.post<ApiResponse<Group>>('/groups', groupData);
    return data.data;
  },

  async updateGroup(id: string, groupData: Partial<CreateGroupForm>): Promise<Group> {
    const { data } = await apiClient.put<ApiResponse<Group>>(`/groups/${id}`, groupData);
    return data.data;
  },

  async deleteGroup(id: string): Promise<void> {
    await apiClient.delete(`/groups/${id}`);
  },

  async getGroupMembers(id: string): Promise<User[]> {
    const { data } = await apiClient.get<ApiResponse<User[]>>(`/groups/${id}/members`);
    return data.data;
  },
};
