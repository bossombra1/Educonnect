import apiClient from '@/services/api';
import { storage, STORAGE_KEYS } from './storage';
import type { Message } from '@/types';
import messageService from '@/services/message.service';

class OfflineManager {
  async cacheMessages(messages: Message[]): Promise<void> {
    await storage.set(STORAGE_KEYS.MESSAGES_CACHE, messages);
    await storage.set(STORAGE_KEYS.MESSAGES_LAST_SYNC, new Date().toISOString());
  }

  async getCachedMessages(): Promise<Message[]> {
    return (await storage.get<Message[]>(STORAGE_KEYS.MESSAGES_CACHE)) ?? [];
  }

  async getLastSync(): Promise<string | null> {
    return storage.get<string>(STORAGE_KEYS.MESSAGES_LAST_SYNC);
  }

  async queueReadReceipt(messageId: string): Promise<void> {
    const pending = (await storage.get<string[]>(STORAGE_KEYS.PENDING_READ_RECEIPTS)) ?? [];
    if (!pending.includes(messageId)) {
      pending.push(messageId);
      await storage.set(STORAGE_KEYS.PENDING_READ_RECEIPTS, pending);
    }
  }

  async processPendingReceipts(): Promise<void> {
    const pending = await storage.get<string[]>(STORAGE_KEYS.PENDING_READ_RECEIPTS);
    if (!pending || pending.length === 0) return;

    const succeeded: string[] = [];
    const failed: string[] = [];

    for (const id of pending) {
      try {
        await messageService.markAsRead(id);
        succeeded.push(id);
      } catch {
        failed.push(id);
      }
    }

    // Conserver les échecs, retirer les succès
    if (failed.length > 0) {
      await storage.set(STORAGE_KEYS.PENDING_READ_RECEIPTS, failed);
    } else {
      await storage.set(STORAGE_KEYS.PENDING_READ_RECEIPTS, []);
    }
  }

  async checkConnectivity(): Promise<boolean> {
    try {
      await apiClient.get('/health', { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}

export const offlineManager = new OfflineManager();
export default offlineManager;
