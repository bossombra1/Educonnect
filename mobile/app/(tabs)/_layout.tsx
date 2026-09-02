import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Tabs } from 'expo-router';
import { MessageCircle, Bell, User, Home } from 'lucide-react-native';
import { Colors, Spacing, FontSize } from '@/theme';
import messageService from '@/services/message.service';

// Context léger pour le compteur de non-lus
interface UnreadContextType {
  unreadCount: number;
  refreshUnread: () => Promise<void>;
}

const UnreadContext = createContext<UnreadContextType>({
  unreadCount: 0,
  refreshUnread: async () => {},
});

export function useUnreadCount() {
  return useContext(UnreadContext);
}

export default function TabsLayout() {
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnread = useCallback(async () => {
    try {
      const count = await messageService.getUnreadCount();
      setUnreadCount(count);
    } catch {
      // silencieux
    }
  }, []);

  useEffect(() => {
    refreshUnread();
  }, [refreshUnread]);

  return (
    <UnreadContext.Provider value={{ unreadCount, refreshUnread }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: true,
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.gray400,
          tabBarStyle: {
            backgroundColor: Colors.white,
            height: 60,
            paddingTop: Spacing.sm,
            paddingBottom: Spacing.md,
            borderTopColor: Colors.gray100,
            borderTopWidth: 1,
          },
          tabBarLabelStyle: {
            fontSize: FontSize.xs,
            fontFamily: 'system-ui',
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Accueil',
            tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="messages"
          options={{
            title: 'Messages',
            tabBarIcon: ({ color, size }) => <MessageCircle size={size} color={color} />,
            tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          }}
        />
        <Tabs.Screen
          name="notifications"
          options={{
            title: 'Notifications',
            tabBarIcon: ({ color, size }) => <Bell size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profil',
            tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
          }}
        />
      </Tabs>
    </UnreadContext.Provider>
  );
}