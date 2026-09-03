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

  async getScheduledMessages(params: Pick<MessageParams, 'page' | 'limit' | 'status'> = {}): Promise<PaginatedResponse<any>> {
    const { data } = await apiClient.get<PaginatedResponse<any>>('/scheduled-messages', { params });
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
    const historyParams: Record<string, string | number> = {};
    if (params.page !== undefined) historyParams.page = params.page;
    if (params.limit !== undefined) historyParams.limit = params.limit;
    if (params.priority) historyParams.priority = params.priority;
    if (params.type) historyParams.type = params.type;
    if (params.startDate) historyParams.date_from = params.startDate;
    if (params.endDate) historyParams.date_to = params.endDate;
    if (params.status) historyParams.status = params.status;
    const { data } = await apiClient.get<PaginatedResponse<Message>>('/messages/history', { params: historyParams });
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
