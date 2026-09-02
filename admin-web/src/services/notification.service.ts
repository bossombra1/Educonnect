import apiClient from './api';
import type { ApiResponse, Notification } from '@/types';

export const notificationService = {
  async getNotifications(): Promise<Notification[]> {
    const { data } = await apiClient.get<ApiResponse<Notification[]>>('/notifications');
    return data.data;
  },
};
