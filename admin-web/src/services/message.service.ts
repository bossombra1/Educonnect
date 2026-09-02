import apiClient from './api';
import type { ApiResponse, PaginatedResponse, Message, CreateMessageForm, MessageStats } from '@/types';

interface MessageParams {
  page?: number;
  limit?: number;
  priority?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}

export const messageService = {
  async getMessages(params: MessageParams = {}): Promise<PaginatedResponse<Message>> {
    const { data } = await apiClient.get<PaginatedResponse<Message>>('/messages', { params });
    return data;
  },

  async getMessage(id: string): Promise<Message> {
    const { data } = await apiClient.get<ApiResponse<Message>>(`/messages/${id}`);
    return data.data;
  },

  async sendMessage(formData: FormData): Promise<Message> {
    const { data } = await apiClient.post<ApiResponse<Message>>('/messages', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data;
  },

  async scheduleMessage(formData: FormData): Promise<Message> {
    const { data } = await apiClient.post<ApiResponse<Message>>('/messages/schedule', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data;
  },

  async getMessageStatistics(id: string): Promise<MessageStats> {
    const { data } = await apiClient.get<ApiResponse<MessageStats>>(`/messages/${id}/statistics`);
    return data.data;
  },

  async getMessageHistory(params: MessageParams = {}): Promise<PaginatedResponse<Message>> {
    const { data } = await apiClient.get<PaginatedResponse<Message>>('/messages/history', { params });
    return data;
  },

  async uploadAttachment(formData: FormData): Promise<{ url: string; filename: string }> {
    const { data } = await apiClient.post<ApiResponse<{ url: string; filename: string }>>('/messages/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data;
  },

  async cancelScheduledMessage(id: string): Promise<void> {
    await apiClient.patch(`/messages/${id}/cancel`);
  },
};
