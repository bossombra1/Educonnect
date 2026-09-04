import apiClient from './api';
import type { ApiResponse, PaginatedResponse, Message, MessageAttachment, MessageRecipient, User, MessageStats } from '@/types';

interface MessageParams {
  page?: number;
  limit?: number;
  priority?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}

interface RecipientPreviewPayload {
  groupIds?: string[];
  classIds?: string[];
  roleIds?: string[];
  recipientIds?: string[];
}

function normalizeAttachment(raw: any): MessageAttachment {
  return {
    id: String(raw.id),
    filename: raw.filename || raw.fileName || raw.file_name || '',
    url: raw.url || raw.fileUrl || raw.file_url || '',
    mimeType: raw.mimeType || raw.fileType || raw.file_type || '',
    size: Number(raw.size ?? raw.fileSize ?? raw.file_size ?? 0),
  };
}

function normalizeRecipient(raw: any): MessageRecipient {
  const user: User | undefined = raw.user || (raw.first_name || raw.last_name || raw.email || raw.firstName || raw.lastName
    ? {
        id: String(raw.userId ?? raw.user_id ?? raw.id), email: raw.email || '', firstName: raw.firstName || raw.first_name || '', lastName: raw.lastName || raw.last_name || '',
        role: raw.role || raw.role_name || 'STAFF', matricule: raw.matricule, phone: raw.phone,
        isActive: Boolean(raw.isActive ?? raw.is_active ?? true), createdAt: raw.createdAt || raw.created_at || '', updatedAt: raw.updatedAt || raw.updated_at || '',
      } : undefined);
  return {
    id: raw.id !== undefined ? String(raw.id) : undefined, userId: String(raw.userId ?? raw.user_id ?? raw.id), user,
    status: raw.status || raw.deliveryStatus || raw.delivery_status || 'pending', interactionStatus: raw.interactionStatus || raw.interaction_status,
    firstName: raw.firstName || raw.first_name || user?.firstName, lastName: raw.lastName || raw.last_name || user?.lastName,
    matricule: raw.matricule || user?.matricule, phone: raw.phone || user?.phone, role: raw.role || raw.role_name || user?.role,
    schoolMatricule: raw.schoolMatricule || raw.school_matricule, studentStatus: raw.studentStatus || raw.student_status,
    classId: raw.classId !== undefined || raw.class_id !== undefined ? String(raw.classId ?? raw.class_id) : undefined,
    className: raw.className || raw.class_name, level: raw.level, section: raw.section,
    establishmentId: raw.establishmentId !== undefined || raw.establishment_id !== undefined ? String(raw.establishmentId ?? raw.establishment_id) : undefined,
    readAt: raw.readAt || raw.read_at || undefined, deliveredAt: raw.deliveredAt || raw.delivered_at || undefined, acknowledgedAt: raw.acknowledgedAt || raw.acknowledged_at || undefined,
  };
}

function normalizeMessage(raw: any): Message {
  const sender = raw.sender || (raw.sender_first_name || raw.sender_last_name || raw.senderFirstName || raw.senderLastName ? {
    id: String(raw.senderId ?? raw.sender_id ?? ''), email: raw.sender_email || '', firstName: raw.senderFirstName || raw.sender_first_name || '', lastName: raw.senderLastName || raw.sender_last_name || '', role: raw.senderRole || raw.sender_role || 'STAFF', isActive: true, createdAt: '', updatedAt: '',
  } as User : undefined);
  const attachments = Array.isArray(raw.attachments) ? raw.attachments.map(normalizeAttachment) : [];
  const recipients = Array.isArray(raw.recipients) ? raw.recipients.map(normalizeRecipient) : [];
  return {
    id: String(raw.id ?? raw.message_id), title: raw.title || undefined, content: raw.content || '', type: raw.type || raw.message_type || 'text', priority: raw.priority || 'normal',
    senderId: String(raw.senderId ?? raw.sender_id ?? ''), sender, recipients,
    groups: Array.isArray(raw.groups) ? raw.groups.map((group: any) => ({ id: String(group.id), name: group.name || '', type: group.type })) : [],
    classes: Array.isArray(raw.classes) ? raw.classes.map((item: any) => ({ id: String(item.id), name: item.name || '', level: item.level, section: item.section })) : [],
    attachments, status: raw.status || 'sent', scheduledAt: raw.scheduledAt || raw.scheduled_at || raw.scheduled_for || undefined, sentAt: raw.sentAt || raw.sent_at || undefined,
    createdAt: raw.createdAt || raw.created_at || raw.message_created_at || '', updatedAt: raw.updatedAt || raw.updated_at || raw.message_updated_at || '',
    readCount: Number(raw.readCount ?? raw.read_count ?? 0), deliveryCount: Number(raw.deliveryCount ?? raw.delivery_count ?? raw.delivered ?? 0), failedCount: Number(raw.failedCount ?? raw.failed_count ?? 0), acknowledgedCount: Number(raw.acknowledgedCount ?? raw.acknowledged_count ?? 0),
    totalRecipients: Number(raw.totalRecipients ?? raw.total_recipients ?? raw.recipient_count ?? recipients.length ?? 0), establishmentName: raw.establishmentName || raw.establishment_name || undefined,
  };
}

function normalizeMessagePage(data: PaginatedResponse<any>): PaginatedResponse<Message> { return { ...data, data: (data.data || []).map(normalizeMessage) }; }

export const messageService = {
  async getMessages(params: MessageParams = {}): Promise<PaginatedResponse<Message>> { const { data } = await apiClient.get<PaginatedResponse<any>>('/messages', { params }); return normalizeMessagePage(data); },
  async getScheduledMessages(params: Pick<MessageParams, 'page' | 'limit' | 'status'> = {}): Promise<PaginatedResponse<any>> { const { data } = await apiClient.get<PaginatedResponse<any>>('/scheduled-messages', { params }); return data; },
  async getScheduledMessage(id: string): Promise<any> { const { data } = await apiClient.get<ApiResponse<any>>(`/scheduled-messages/${id}`); return data.data; },
  async getMessage(id: string): Promise<Message> { const { data } = await apiClient.get<ApiResponse<any>>(`/messages/${id}`); return normalizeMessage(data.data); },
  async getMessageHistoryDetail(id: string): Promise<Message> { const { data } = await apiClient.get<ApiResponse<any>>(`/messages/history/${id}`); return normalizeMessage(data.data); },
  async previewRecipients(payload: RecipientPreviewPayload): Promise<{ recipientCount: number; recipientIds: string[] }> {
    const { data } = await apiClient.post<ApiResponse<{ recipient_count: number; recipient_ids: string[] }>>('/messages/recipients/preview', payload);
    return { recipientCount: Number(data.data?.recipient_count || 0), recipientIds: data.data?.recipient_ids || [] };
  },
  async sendMessage(formData: FormData): Promise<Message> {
    const isDraft = formData.get('status') === 'draft';
    const endpoint = isDraft ? '/messages/drafts' : '/messages';
    const { data } = await apiClient.post<ApiResponse<any>>(endpoint, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    return normalizeMessage(data.data);
  },
  async saveDraft(formData: FormData): Promise<Message> {
    if (formData.get('status') !== 'draft') formData.append('status', 'draft');
    const { data } = await apiClient.post<ApiResponse<any>>('/messages/drafts', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    return normalizeMessage(data.data);
  },
  async scheduleMessage(formData: FormData): Promise<Message> { const { data } = await apiClient.post<ApiResponse<any>>('/messages/schedule', formData, { headers: { 'Content-Type': 'multipart/form-data' } }); return normalizeMessage(data.data); },
  async getMessageStatistics(id: string): Promise<MessageStats> { const { data } = await apiClient.get<ApiResponse<MessageStats>>(`/messages/${id}/statistics`); return data.data; },
  async getMessageHistory(params: MessageParams = {}): Promise<PaginatedResponse<Message>> {
    const historyParams: Record<string, string | number> = {};
    if (params.page !== undefined) historyParams.page = params.page; if (params.limit !== undefined) historyParams.limit = params.limit; if (params.priority) historyParams.priority = params.priority; if (params.type) historyParams.type = params.type; if (params.startDate) historyParams.date_from = params.startDate; if (params.endDate) historyParams.date_to = params.endDate; if (params.status) historyParams.status = params.status;
    const { data } = await apiClient.get<PaginatedResponse<any>>('/messages/history', { params: historyParams }); return normalizeMessagePage(data);
  },
  async uploadAttachment(formData: FormData): Promise<{ url: string; filename: string }> { const { data } = await apiClient.post<ApiResponse<{ url: string; filename: string }>>('/messages/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }); return data.data; },
  async cancelScheduledMessage(id: string): Promise<void> { await apiClient.patch(`/messages/${id}/cancel`); },
};
