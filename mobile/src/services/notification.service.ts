import apiClient from './api';
import type { Notification, PaginatedResponse } from '@/types';

class NotificationService {
  async getUserNotifications(page: number = 1, limit: number = 20): Promise<PaginatedResponse<Notification>> {
    const { data } = await apiClient.get<PaginatedResponse<Notification>>('/notifications', {
      params: { page, limit },
    });
    return data;
  }

  async registerFcmToken(token: string, deviceType: string = 'mobile'): Promise<void> {
    await apiClient.post('/notifications/register-token', {
      token,
      device_type: deviceType,
    });
  }

  async markNotificationAsRead(id: string): Promise<void> {
    await apiClient.post(`/notifications/${id}/read`);
  }
}

export const notificationService = new NotificationService();
export default notificationService;
