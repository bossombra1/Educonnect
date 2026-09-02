import apiClient from './api';
import type { Message, PaginatedResponse, ApiResponse } from '@/types';

class MessageService {
  async getMessages(page: number = 1, limit: number = 20): Promise<PaginatedResponse<Message>> {
    const { data } = await apiClient.get<PaginatedResponse<Message>>('/api/messages', {
      params: { page, limit },
    });
    return data;
  }

  async getMessageById(id: string): Promise<Message> {
    const { data } = await apiClient.get<ApiResponse<Message>>(`/api/messages/${id}`);
    return data.data;
  }

  async markAsRead(id: string): Promise<void> {
    await apiClient.post(`/api/messages/${id}/read`);
  }

  async acknowledgeMessage(id: string): Promise<void> {
    await apiClient.post(`/api/messages/${id}/acknowledge`);
  }

  async getUnreadCount(): Promise<number> {
    const { data } = await apiClient.get<ApiResponse<{ count: number }>>('/messages/unread-count');
    return data.data.count;
  }
}

export const messageService = new MessageService();
export default messageService;
