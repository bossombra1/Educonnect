import { useState, useEffect, useCallback } from 'react';
import messageService from '@/services/message.service';
import { offlineManager } from '@/storage/offline';
import type { Message } from '@/types';

interface UseMessagesReturn {
  messages: Message[];
  loading: boolean;
  refreshing: boolean;
  unreadCount: number;
  page: number;
  hasMore: boolean;
  loadMessages: (page?: number) => Promise<void>;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
}

export function useMessages(): UseMessagesReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const count = await messageService.getUnreadCount();
      setUnreadCount(count);
    } catch {
      // Silencieux en cas d'erreur
    }
  }, []);

  const loadMessages = useCallback(async (targetPage: number = 1) => {
    try {
      const response = await messageService.getMessages(targetPage);
      if (targetPage === 1) {
        setMessages(response.data);
      } else {
        setMessages((prev) => [...prev, ...response.data]);
      }
      setPage(targetPage);
      setHasMore(targetPage < response.last_page);
      await offlineManager.cacheMessages(response.data);
    } catch {
      // Charger le cache en cas d'erreur
      const cached = await offlineManager.getCachedMessages();
      if (cached.length > 0 && targetPage === 1) {
        setMessages(cached);
      }
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadMessages(1);
      await fetchUnreadCount();
      await offlineManager.processPendingReceipts();
    } finally {
      setRefreshing(false);
    }
  }, [loadMessages, fetchUnreadCount]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    const nextPage = page + 1;
    await loadMessages(nextPage);
  }, [hasMore, loading, page, loadMessages]);

  const markAsRead = useCallback(async (id: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, read_status: 'read' as const } : m))
    );
    try {
      await messageService.markAsRead(id);
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      await offlineManager.queueReadReceipt(id);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadMessages(1);
      await fetchUnreadCount();
      setLoading(false);
    };
    init();
  }, [loadMessages, fetchUnreadCount]);

  return {
    messages,
    loading,
    refreshing,
    unreadCount,
    page,
    hasMore,
    loadMessages,
    refresh,
    loadMore,
    markAsRead,
  };
}

export default useMessages;
