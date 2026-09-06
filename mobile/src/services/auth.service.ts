import apiClient from './api';
import * as SecureStore from 'expo-secure-store';
import type { User, Child, OtpRequest, OtpVerifyRequest, OtpResponse, ApiResponse, MobileRole } from '@/types';

type BackendUser = {
  id: number | string;
  matricule: string;
  first_name?: string | null;
  last_name?: string | null;
  role?: 'PARENT' | 'STUDENT' | 'STAFF' | 'ADMIN' | 'SUPER_ADMIN' | string;
  role_name?: 'PARENT' | 'STUDENT' | 'STAFF' | 'ADMIN' | 'SUPER_ADMIN' | string;
  establishment_id: number | string | null;
  phone?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  establishment_name?: string | null;
  created_at?: string | null;
  children?: Array<Record<string, unknown>>;
};

const ROLE_MAP: Record<string, User['role']> = {
  PARENT: 'parent',
  STUDENT: 'student',
  STAFF: 'staff',
  ADMIN: 'admin',
  SUPER_ADMIN: 'admin',
};

const MOBILE_ROLE_MAP: Record<'PARENT' | 'STUDENT' | 'STAFF', MobileRole> = {
  PARENT: 'parent',
  STUDENT: 'student',
  STAFF: 'staff',
};

function normalizeChild(child: Record<string, unknown>): Child | null {
  const id = String(child.student_id ?? child.id ?? '');
  if (!id) return null;

  return {
    id,
    matricule: String(child.matricule_scolaire ?? child.matricule ?? ''),
    full_name: [child.first_name, child.last_name].filter(Boolean).join(' ') || String(child.full_name ?? ''),
    class_name: String(child.class_name ?? ''),
    ...(child.avatar_url ? { avatar_url: String(child.avatar_url) } : {}),
  };
}

function normalizeUser(user: BackendUser): User {
  const firstName = user.first_name?.trim() ?? '';
  const lastName = user.last_name?.trim() ?? '';
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
  const backendRole = user.role ?? user.role_name ?? '';
  const role = ROLE_MAP[backendRole];
  if (!role) throw new Error('Rôle utilisateur non reconnu.');

  const children = (user.children ?? [])
    .map(normalizeChild)
    .filter((child): child is Child => child !== null);

  return {
    id: String(user.id),
    matricule: user.matricule,
    phone: user.phone ?? '',
    full_name: fullName || user.matricule,
    role,
    ...(user.email ? { email: user.email } : {}),
    ...(user.avatar_url ? { avatar_url: user.avatar_url } : {}),
    establishment_id: user.establishment_id === null ? '' : String(user.establishment_id),
    ...(user.establishment_name ? { establishment_name: user.establishment_name } : {}),
    created_at: user.created_at ?? new Date().toISOString(),
    ...(children.length > 0 ? { children } : {}),
  };
}

class AuthService {
  async requestOtp(request: OtpRequest): Promise<ApiResponse<{ message: string; requiresChildMatricule?: boolean }>> {
    const { data } = await apiClient.post<ApiResponse<{ message: string; requiresChildMatricule?: boolean }>>('/auth/otp/request', request);
    return data;
  }

  async verifyOtp(request: OtpVerifyRequest): Promise<OtpResponse> {
    const { data } = await apiClient.post<ApiResponse<{ token: string; user: BackendUser }>>('/auth/otp/verify', request);
    const response: OtpResponse = { token: data.data.token, user: normalizeUser(data.data.user) };
    const expectedRole = MOBILE_ROLE_MAP[request.role];
    if (response.user.role !== expectedRole) {
      await this.clearSession();
      throw new Error('Le rôle authentifié ne correspond pas au rôle sélectionné.');
    }
    await SecureStore.setItemAsync('auth_token', response.token);
    await SecureStore.setItemAsync('auth_user', JSON.stringify(response.user));
    await SecureStore.setItemAsync('auth_role', response.user.role);
    return response;
  }

  async getProfile(): Promise<User> {
    const { data } = await apiClient.get<ApiResponse<BackendUser>>('/auth/profile');
    const user = normalizeUser(data.data);
    await SecureStore.setItemAsync('auth_user', JSON.stringify(user));
    await SecureStore.setItemAsync('auth_role', user.role);
    return user;
  }

  async logout(): Promise<void> {
    try { await apiClient.post('/auth/logout'); } catch { /* network errors are non-blocking */ }
    finally { await this.clearSession(); }
  }

  async clearSession(): Promise<void> {
    await Promise.all([
      SecureStore.deleteItemAsync('auth_token'),
      SecureStore.deleteItemAsync('auth_user'),
      SecureStore.deleteItemAsync('auth_role'),
    ]);
  }

  async getStoredUser(): Promise<User | null> {
    try {
      const raw = await SecureStore.getItemAsync('auth_user');
      return raw ? JSON.parse(raw) as User : null;
    } catch { return null; }
  }

  async getStoredRole(): Promise<MobileRole | null> {
    const role = await SecureStore.getItemAsync('auth_role');
    return role === 'parent' || role === 'student' || role === 'staff' ? role : null;
  }

  async getStoredToken(): Promise<string | null> { return SecureStore.getItemAsync('auth_token'); }
  async isAuthenticated(): Promise<boolean> { return !!(await this.getStoredToken()); }
}

export const authService = new AuthService();
export default authService;
