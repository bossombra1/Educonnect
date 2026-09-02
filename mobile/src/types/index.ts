export interface User {
  id: string;
  matricule: string;
  phone: string;
  full_name: string;
  role: 'parent' | 'student' | 'staff' | 'admin';
  email?: string;
  avatar_url?: string;
  establishment_id: string;
  establishment_name?: string;
  created_at: string;
}

export interface Student {
  id: string;
  matricule: string;
  full_name: string;
  class_name: string;
  establishment_id: string;
}

export interface Child {
  id: string;
  matricule: string;
  full_name: string;
  class_name: string;
  avatar_url?: string;
}

export type MessagePriority = 'normal' | 'high' | 'urgent';
export type MessageType = 'text' | 'image' | 'pdf' | 'link';
export type ReadStatus = 'sent' | 'delivered' | 'read';

export interface Message {
  id: string;
  title: string;
  content: string;
  message_type: MessageType;
  file_url?: string;
  file_name?: string;
  link_url?: string;
  priority: MessagePriority;
  sent_at: string;
  read_status: ReadStatus;
  sender_name?: string;
  sender_role?: string;
  is_acknowledged?: boolean;
}

export interface MessageRecipient {
  id: string;
  message_id: string;
  user_id: string;
  read_status: ReadStatus;
  read_at?: string;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  read: boolean;
  created_at: string;
  type?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface OtpRequest {
  phone: string;
  matricule?: string;
  childMatricule?: string;
}

export interface OtpVerifyRequest {
  phone: string;
  code: string;
  matricule?: string;
  childMatricule?: string;
}

export interface OtpResponse {
  token: string;
  user: User;
}
