import type { ApiEnvelope, Message, Notification, User } from '../types';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/$/, '');
const TOKEN_KEY = 'educonnect_client_token';

function normalizeUser(raw: User & { role_name?: string; establishment_name?: string | null }): User {
  return { ...raw, role: raw.role || raw.role_name || '' };
}

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY);
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  const payload = (await response.json().catch(() => ({}))) as Partial<ApiEnvelope<T>>;
  if (!response.ok || payload.success === false) {
    if (response.status === 401) localStorage.removeItem(TOKEN_KEY);
    throw new ApiError(payload.error || payload.message || 'Une erreur est survenue.', response.status);
  }
  return payload.data as T;
}

export const authApi = {
  login: (role: 'PARENT' | 'STUDENT' | 'STAFF', identifier: string, password: string) => request<{ token: string; user: User }>('/auth/mobile-login', {
    method: 'POST',
    body: JSON.stringify({ role, identifier, password }),
  }),
  profile: async () => normalizeUser(await request<User & { role_name?: string; establishment_name?: string | null }>('/auth/profile')),
  updateProfile: async (updates: { currentPassword: string; password?: string; phone?: string; email?: string }) => normalizeUser(await request<User & { role_name?: string; establishment_name?: string | null }>('/auth/profile', {
    method: 'PATCH',
    body: JSON.stringify(updates),
  })),
};

export const messagesApi = {
  list: () => request<Message[]>('/messages?limit=100'),
  get: (id: number) => request<Message>(`/messages/${id}`),
  markRead: (id: number) => request<unknown>(`/messages/${id}/read`, { method: 'POST' }),
  acknowledge: (id: number) => request<unknown>(`/messages/${id}/acknowledge`, {
    method: 'POST',
    body: JSON.stringify({ acknowledged_at: new Date().toISOString() }),
  }),
};

export const notificationsApi = {
  list: () => request<Notification[]>('/notifications?limit=100'),
};

export { TOKEN_KEY };
