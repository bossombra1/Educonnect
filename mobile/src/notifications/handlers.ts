import { resetToApp } from '@/navigation/NavigationRef';

export type MobileNotification = {
  title?: string | null;
  data?: Record<string, unknown> | null;
};

export function handleNotificationForeground(notification: MobileNotification): void {
  const title = notification.title ?? 'Nouvelle notification';
  console.log(`[Avant-plan] ${title}`, notification.data ?? {});
}

export function handleNotificationTap(notification: MobileNotification): void {
  const messageId = notification.data?.messageId;

  if (messageId) {
    resetToApp();
  }
}
