import { useCallback, useEffect, useState } from 'react';
import { ApiError, authApi, TOKEN_KEY } from '../services/api';
import type { User } from '../types';

const USER_KEY = 'educonnect_client_user';
function readUser(): User | null { try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null') as User | null; } catch { return null; } }

export function useAuth() {
  const [user, setUser] = useState<User | null>(readUser);
  const [loading, setLoading] = useState(Boolean(localStorage.getItem(TOKEN_KEY)));
  useEffect(() => { if (!localStorage.getItem(TOKEN_KEY)) { setLoading(false); return; } authApi.profile().then((profile) => { setUser(profile); localStorage.setItem(USER_KEY, JSON.stringify(profile)); }).catch(() => { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); setUser(null); }).finally(() => setLoading(false)); }, []);
  const signIn = useCallback((token: string, nextUser: User) => { localStorage.setItem(TOKEN_KEY, token); localStorage.setItem(USER_KEY, JSON.stringify(nextUser)); setUser(nextUser); }, []);
  const signOut = useCallback(() => { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); setUser(null); }, []);
  return { user, loading, isAuthenticated: Boolean(user), signIn, signOut, ApiError };
}
