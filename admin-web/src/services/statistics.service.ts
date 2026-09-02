import apiClient from './api';
import type { ApiResponse, DashboardStats, MessageStats } from '@/types';

export const statisticsService = {
  async getDashboard(): Promise<DashboardStats> {
    const { data } = await apiClient.get<ApiResponse<DashboardStats>>('/statistics/dashboard');
    return data.data;
  },

  async getMessageStats(): Promise<MessageStats> {
    const { data } = await apiClient.get<ApiResponse<MessageStats>>('/statistics/messages');
    return data.data;
  },
};
