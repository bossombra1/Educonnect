// =============================================================
// EduConnect Backend Types — matched to the actual database schema
// =============================================================

import type { Request } from 'express';

export interface Role { id: number; name: string; label: string; description: string | null; level: number; created_at: Date; }
export interface User { id: number; establishment_id: number | null; role_id: number; matricule: string; first_name: string; last_name: string; phone: string | null; phone_hash: string | null; email: string | null; password_hash: string; avatar_url: string | null; fcm_token: string | null; device_type: DeviceType | null; otp_code: string | null; otp_expires_at: Date | null; otp_verified: boolean; last_login_at: Date | null; is_active: number; created_at: Date; updated_at: Date; }
export type DeviceType = 'android' | 'ios' | 'web';
export type RoleName = 'SUPER_ADMIN' | 'ADMIN' | 'PARENT' | 'STUDENT' | 'STAFF';
export interface Student { id: number; user_id: number; class_id: number; establishment_id: number; matricule_scolaire: string | null; admission_date: string | null; status: StudentStatus; created_at: Date; updated_at: Date; }
export type StudentStatus = 'active' | 'transferred' | 'graduated' | 'suspended';
export interface Parent { id: number; user_id: number; establishment_id: number; profession: string | null; is_primary_contact: number; created_at: Date; updated_at: Date; }
export interface Staff { id: number; user_id: number; establishment_id: number; role_title: string; department: string | null; created_at: Date; updated_at: Date; }
export interface ParentStudent { id: number; parent_id: number; student_id: number; priority: 'parent1' | 'parent2'; is_emergency_contact: number; created_at: Date; }
export interface Class { id: number; establishment_id: number; name: string; level: string; section: string | null; capacity: number | null; school_year: string; is_active: number; created_at: Date; updated_at: Date; }
export interface Group { id: number; establishment_id: number; name: string; description: string | null; group_type: GroupType; filters: Record<string, any> | null; is_active: number; created_at: Date; updated_at: Date; }
export type GroupType = 'class' | 'level' | 'role' | 'custom' | 'all_school';
export interface GroupMember { id: number; group_id: number; user_id: number; created_at: Date; }
export interface Message { id: number; establishment_id: number; sender_id: number; title: string | null; content: string; message_type: MessageType; priority: MessagePriority; status: MessageStatus; scheduled_at: Date | null; sent_at: Date | null; created_at: Date; updated_at: Date; }
export type MessageType = 'text' | 'image' | 'pdf' | 'link' | 'circular';
export type MessagePriority = 'normal' | 'important' | 'urgent';
export type MessageStatus = 'draft' | 'scheduled' | 'sent' | 'archived';
export interface MessageRecipient { id: number; message_id: number; user_id: number; delivery_status: DeliveryStatus; delivered_at: Date | null; created_at: Date; }
export type DeliveryStatus = 'pending' | 'delivered' | 'failed';
export interface MessageRead { id: number; message_id: number; user_id: number; read_at: Date; created_at: Date; }
export interface MessageAcknowledgement { id: number; message_id: number; user_id: number; acknowledged_at: Date; created_at: Date; }
export interface MessageAttachment { id: number; message_id: number; file_name: string; file_url: string; file_type: AttachmentFileType; file_size: number | null; created_at: Date; }
export type AttachmentFileType = 'image' | 'pdf' | 'other';
export interface Notification { id: number; user_id: number; message_id: number | null; title: string; body: string | null; data: Record<string, any> | null; fcm_status: FcmStatus; fcm_message_id: string | null; sent_at: Date | null; created_at: Date; }
export type FcmStatus = 'pending' | 'sent' | 'delivered' | 'failed';
export interface ScheduledMessage { id: number; establishment_id: number; message_id: number; scheduled_for: Date; status: ScheduledStatus; retry_count: number; last_attempt_at: Date | null; error_message: string | null; created_at: Date; updated_at: Date; }
export type ScheduledStatus = 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled';
export interface Import { id: number; establishment_id: number; filename: string; file_url: string; total_rows: number; imported_rows: number; failed_rows: number; status: ImportStatus; error_log: string | null; imported_by: number; created_at: Date; }
export type ImportStatus = 'pending' | 'processing' | 'completed' | 'failed';
export interface AuditLog { id: number; establishment_id: number | null; user_id: number | null; action: string; entity_type: string; entity_id: number | null; details: Record<string, any> | null; ip_address: string | null; user_agent: string | null; created_at: Date; }
export interface Establishment { id: number; name: string; slug: string; logo_url: string | null; address: string | null; phone: string | null; email: string | null; max_students: number | null; is_active: number; created_at: Date; updated_at: Date; }
export interface LoginRequest { email: string; password: string; }
export interface OtpRequest { matricule: string; }
export interface OtpVerify { matricule: string; code: string; }
export interface CreateMessageInput { group_ids?: number[]; recipient_ids?: number[]; title?: string; content: string; message_type?: MessageType; priority?: MessagePriority; link_url?: string; }
export interface CreateGroupInput { name: string; group_type: GroupType; description?: string; filters?: Record<string, any>; user_ids?: number[]; }
export interface ImportResult { totalRows: number; successCount: number; failCount: number; errors: Array<{ row: number; message: string }>; }
export interface JwtPayload { userId: number; role: string; establishmentId: number; }
export interface ApiResponse<T = unknown> { success: boolean; data?: T; message?: string; }
export interface PaginatedResponse<T = unknown> extends ApiResponse<T> { pagination?: { page: number; limit: number; total: number; totalPages: number }; }
export interface PaginationOptions { page?: number; limit?: number; }
export interface PaginationResult { data: any[]; total: number; page: number; limit: number; totalPages: number; }
export interface ValidationRule { type?: string; required?: boolean; minLength?: number; maxLength?: number; min?: number; max?: number; pattern?: RegExp; custom?: (value: any) => string | null; }
export interface ValidationSchema { [key: string]: ValidationRule; }

export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer;
  stream: NodeJS.ReadableStream;
}

// Protected controllers receive Express.Request. Authentication is represented by the global declaration below.
export type RequestWithUser = Request;

declare global {
  namespace Express {
    interface Request {
      user: JwtPayload & { email: string };
      file?: UploadedFile;
      files?: UploadedFile[];
    }
    interface Response {
      success: (data?: any, message?: string, statusCode?: number, pagination?: any) => this;
      error: (message: string, statusCode?: number) => this;
    }
  }
}
