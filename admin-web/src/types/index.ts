export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'PARENT' | 'STUDENT' | 'STAFF';

export type MessagePriority = 'normal' | 'important' | 'urgent';
export type MessageType = 'text' | 'image' | 'pdf' | 'link' | 'circular';
export type MessageStatus = 'draft' | 'pending' | 'processing' | 'sent' | 'delivered' | 'failed';
export type DeliveryStatus = 'delivered' | 'failed' | 'pending';
export type GroupType = 'class' | 'level' | 'role' | 'custom' | 'all_school';

export interface User {
  id: string; email: string; firstName: string; lastName: string; role: UserRole; phone?: string; matricule?: string; classId?: string; className?: string; matriculeScolaire?: string; studentStatus?: string; roleTitle?: string; department?: string; isActive: boolean; createdAt: string; updatedAt: string; lastLogin?: string;
}
export interface Student extends User { role: 'STUDENT'; matricule: string; classId: string; parentId?: string; class?: Class; }
export interface Parent extends User { role: 'PARENT'; children?: Student[]; }
export interface Staff extends User { role: 'STAFF'; fonction?: string; departement?: string; }
export interface Class { id: string; name: string; level: string; section?: string; capacity: number; studentCount?: number; schoolYear: string; createdAt: string; updatedAt: string; }
export interface Group { id: string; name: string; type: GroupType; description?: string; filters?: Record<string, string[]>; memberCount: number; createdAt: string; updatedAt: string; }
export interface MessageAttachment { id: string; filename: string; url: string; mimeType: string; size: number; }
export interface MessageRecipient { userId: string; user?: User; status: DeliveryStatus; readAt?: string; deliveredAt?: string; }
export interface Message { id: string; title?: string; content: string; type: MessageType; priority: MessagePriority; senderId: string; sender?: User; recipients: MessageRecipient[]; attachments: MessageAttachment[]; status: MessageStatus; scheduledAt?: string; sentAt?: string; createdAt: string; updatedAt: string; readCount: number; deliveryCount: number; totalRecipients: number; }
export interface MessageRead { messageId: string; userId: string; readAt: string; }
export interface ScheduledMessage { id: string; message: Message; scheduledAt: string; status: 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled'; retryCount: number; lastError?: string; }
export interface Notification { id: string; title: string; message: string; type: string; read: boolean; createdAt: string; }
export interface DashboardStats { totalStudents: number; totalParents: number; totalStaff: number; totalClasses: number; totalMessagesSent: number; readRate: number; scheduledMessages: number; recentMessages: Message[]; messagesPerDay: { date: string; count: number }[]; }
export interface MessageStats { totalSent: number; totalRead: number; readRate: number; byDay: { date: string; sent: number; read: number }[]; byType: { type: string; count: number }[]; unreadMessages: Message[]; }
export interface ApiResponse<T> { success: boolean; data: T; message?: string; }
export interface PaginatedResponse<T> { success: boolean; data: T[]; pagination: { page: number; limit: number; total: number; totalPages: number; }; }
export interface LoginRequest { email: string; password: string; }
export interface LoginResponse { user: User; token: string; }
export interface CreateMessageForm { title?: string; content: string; type: MessageType; priority: MessagePriority; recipientIds?: string[]; groupIds?: string[]; classIds?: string[]; roleIds?: UserRole[]; scheduledAt?: string; attachments?: File[]; }
export interface ImportResult { total: number; success: number; failed: number; errors: { row: number; message: string }[]; }
export interface CreateGroupForm { name: string; type: GroupType; description?: string; filters?: Record<string, string[]>; }
