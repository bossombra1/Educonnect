import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import messageService from '@/services/message.service';

interface UnreadContextValue {
  unreadCount: number;
  refreshUnread: () => Promise<void>;
}

const UnreadContext = createContext<UnreadContextValue>({
  unreadCount: 0,
  refreshUnread: async () => {},
});

export function UnreadProvider({ children }: { children: React.ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnread = useCallback(async () => {
    try {
      setUnreadCount(await messageService.getUnreadCount());
    } catch {
      // Keep the last known value when offline or when the API is unavailable.
    }
  }, []);

  useEffect(() => {
    void refreshUnread();
  }, [refreshUnread]);

  return <UnreadContext.Provider value={{ unreadCount, refreshUnread }}>{children}</UnreadContext.Provider>;
}

export function useUnreadCount() {
  return useContext(UnreadContext);
}
