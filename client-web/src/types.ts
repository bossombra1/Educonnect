export type MessageCategory = 'Convocation' | 'Urgence' | 'Vie scolaire' | 'Devoirs' | 'Autre';

export interface User {
  id: number;
  first_name: string;
  last_name: string;
  email?: string | null;
  matricule?: string | null;
  phone?: string | null;
  role: string;
  establishment_name?: string | null;
  children?: Array<{ first_name: string; last_name: string; class_name?: string | null }>;
}

export interface Attachment {
  id: number;
  file_name: string;
  file_url: string;
  file_type: string;
}

export interface Message {
  id: number;
  title: string | null;
  content: string;
  message_type: string;
  priority: 'normal' | 'important' | 'urgent';
  sent_at: string | null;
  created_at: string;
  sender_first_name?: string | null;
  sender_last_name?: string | null;
  is_read: boolean;
  is_acknowledged: boolean;
  requires_acknowledgement?: boolean;
  attachments?: Attachment[];
}

export interface Notification {
  id: number;
  message_id?: number | null;
  title: string;
  body: string | null;
  data?: string | Record<string, unknown> | null;
  fcm_status: 'pending' | 'sent' | 'delivered' | 'failed';
  created_at: string;
  sent_at?: string | null;
}

export interface PaginatedMessages {
  data: Message[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  error?: string;
  message?: string;
}
