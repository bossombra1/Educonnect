import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { notificationService } from '@/services/notification.service';
import { storage, STORAGE_KEYS } from '@/storage/storage';
import { handleNotificationForeground, handleNotificationTap } from './handlers';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function setupNotifications(): Promise<() => void> {
  // Demander la permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Permission de notification non accordée');
  }

  // Configurer les canaux Android
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

  // Obtenir le token FCM
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const fcmToken = tokenData.data;
    await storage.set(STORAGE_KEYS.FCM_TOKEN, fcmToken);
    await notificationService.registerFcmToken(fcmToken);
  } catch (error) {
    console.warn('Erreur lors de l\'enregistrement du token FCM:', error);
  }

  // Écouter les notifications reçues en avant-plan
  const foregroundSubscription = Notifications.addNotificationReceivedListener((notification) => {
    handleNotificationForeground(notification);
  });

  // Écouter les interactions avec les notifications
  const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
    handleNotificationTap(response);
  });

  // Fonction de nettoyage
  return () => {
    foregroundSubscription.remove();
    responseSubscription.remove();
  };
}
