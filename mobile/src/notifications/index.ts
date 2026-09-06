import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { notificationService } from '@/services/notification.service';
import { storage, STORAGE_KEYS } from '@/storage/storage';
import { handleNotificationForeground, handleNotificationTap } from './handlers';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function setupNotifications(): Promise<() => void> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') console.warn('Permission de notification non accordée');

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Messages',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1E40AF',
    });
    await Notifications.setNotificationChannelAsync('urgent', {
      name: 'Messages urgents',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 100, 200, 300, 400],
      lightColor: '#DC2626',
    });
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const fcmToken = tokenData.data;
    await storage.set(STORAGE_KEYS.FCM_TOKEN, fcmToken);
    await notificationService.registerFcmToken(fcmToken);
  } catch (error) {
    console.warn('Erreur lors de l\'enregistrement du token FCM:', error);
  }

  const foregroundSubscription = Notifications.addNotificationReceivedListener((notification) => handleNotificationForeground(notification));
  const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => handleNotificationTap(response));

  return () => {
    foregroundSubscription.remove();
    responseSubscription.remove();
  };
}
