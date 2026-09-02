import type { Notification as ExpoNotification } from 'expo-notifications';
import { router } from 'expo-router';

export function handleNotificationForeground(notification: ExpoNotification): void {
  const data = notification.request.content.data;
  const title = notification.request.content.title ?? 'Nouvelle notification';
  console.log(`[Avant-plan] ${title}`, data);
}

export function handleNotificationTap(response: { notification: ExpoNotification }): void {
  const data = response.notification.request.content.data;
  const messageId = data?.messageId as string | undefined;

  if (messageId) {
    router.push(`/messages/${messageId}`);
  }
}