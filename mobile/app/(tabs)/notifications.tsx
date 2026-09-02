import React, { useState, useEffect, useCallback } from 'react';
import { View, FlatList, Text, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, Check } from 'lucide-react-native';
import { format, isToday, isYesterday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '@/theme';
import { useConnectivity } from '@/hooks/useConnectivity';
import notificationService from '@/services/notification.service';
import EmptyState from '@/components/shared/EmptyState';
import OfflineBanner from '@/components/ui/OfflineBanner';
import type { Notification as AppNotification } from '@/types';

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const isConnected = useConnectivity();

  const loadNotifications = useCallback(async () => {
    try {
      const response = await notificationService.getUserNotifications(1, 50);
      setNotifications(response.data);
    } catch {
      // silencieux
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadNotifications();
      setLoading(false);
    };
    init();
  }, [loadNotifications]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const handleMarkAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    try {
      await notificationService.markNotificationAsRead(id);
    } catch {
      // silencieux
    }
  };

  const formatNotifDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    if (isToday(date)) return "Aujourd'hui";
    if (isYesterday(date)) return 'Hier';
    return format(date, 'd MMM yyyy', { locale: fr });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <OfflineBanner visible={!isConnected} />

        <View style={styles.header}>
          <Text style={styles.headerTitle}>Notifications</Text>
          <Text style={styles.headerSubtitle}>
            {notifications.filter(n => !n.read).length} non lue{notifications.filter(n => !n.read).length > 1 ? 's' : ''}
          </Text>
        </View>

        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.notifCard, Shadows.sm, !item.read && styles.notifUnread]}
              onPress={() => handleMarkAsRead(item.id)}
              activeOpacity={0.7}
            >
              <View style={styles.notifIcon}>
                <Bell size={18} color={item.read ? Colors.gray400 : Colors.primary} />
              </View>
              <View style={styles.notifContent}>
                <View style={styles.notifHeader}>
                  <Text style={[styles.notifTitle, !item.read && styles.notifTitleBold]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  {!item.read && <View style={styles.notifDot} />}
                </View>
                <Text style={styles.notifBody} numberOfLines={2}>{item.body}</Text>
                <Text style={styles.notifDate}>{formatNotifDate(item.created_at)}</Text>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }
          ListEmptyComponent={
            <EmptyState
              title="Aucune notification"
              description="Vos notifications apparaîtront ici."
            />
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  headerTitle: {
    fontSize: FontSize['2xl'],
    fontWeight: '700',
    color: Colors.gray900,
    fontFamily: 'system-ui',
  },
  headerSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.gray500,
    fontFamily: 'system-ui',
    marginTop: 2,
  },
  list: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing['3xl'],
  },
  notifCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  notifUnread: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  notifIcon: {
    marginTop: 2,
  },
  notifContent: {
    flex: 1,
  },
  notifHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 4,
  },
  notifTitle: {
    fontSize: FontSize.md,
    fontWeight: '400',
    color: Colors.gray800,
    fontFamily: 'system-ui',
    flex: 1,
  },
  notifTitleBold: {
    fontWeight: '600',
  },
  notifDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  notifBody: {
    fontSize: FontSize.sm,
    color: Colors.gray600,
    fontFamily: 'system-ui',
    lineHeight: 20,
    marginBottom: 4,
  },
  notifDate: {
    fontSize: FontSize.xs,
    color: Colors.gray400,
    fontFamily: 'system-ui',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    color: Colors.gray400,
    fontSize: FontSize.sm,
    fontFamily: 'system-ui',
  },
});
