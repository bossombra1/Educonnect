import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { ChevronRight, MessageCircle, Bell } from 'lucide-react-native';
import Constants from 'expo-constants';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '@/theme';
import { useAuth } from '@/hooks/useAuth';
import { useUnreadCount } from './_layout';
import MessageCard from '@/components/shared/MessageCard';
import EmptyState from '@/components/shared/EmptyState';
import messageService from '@/services/message.service';
import type { Message } from '@/types';

export default function HomeScreen() {
  const { user } = useAuth();
  const { unreadCount, refreshUnread } = useUnreadCount();
  const [recentMessages, setRecentMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const establishmentName = Constants.expoConfig?.extra?.establishmentSlug ?? 'Votre établissement';

  const loadRecent = async () => {
    try {
      const response = await messageService.getMessages(1, 3);
      setRecentMessages(response.data);
    } catch {
      // silencieux
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadRecent();
      await refreshUnread();
      setLoading(false);
    };
    init();
  }, [refreshUnread]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRecent();
    await refreshUnread();
    setRefreshing(false);
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  const displayName = user?.full_name ?? 'Utilisateur';
  const firstName = displayName.split(' ').pop() ?? displayName;
  const roleLabels: Record<string, string> = {
    parent: 'Parent',
    student: 'Élève',
    staff: 'Personnel',
    admin: 'Administrateur',
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* En-tête */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatarSmall}>
              <Text style={styles.avatarSmallText}>
                {displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={styles.greeting}>{greeting()} {firstName}</Text>
              <Text style={styles.establishment}>{establishmentName}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => router.push('/(tabs)/notifications')}>
            <Bell size={22} color={Colors.gray600} />
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, Shadows.sm]}>
            <MessageCircle size={20} color={Colors.primary} />
            <Text style={styles.statValue}>{unreadCount}</Text>
            <Text style={styles.statLabel}>Non lus</Text>
          </View>
          <View style={[styles.statCard, Shadows.sm]}>
            <Bell size={20} color={Colors.secondary} />
            <Text style={styles.statValue}>{recentMessages.length}</Text>
            <Text style={styles.statLabel}>Récents</Text>
          </View>
          <View style={[styles.statCard, Shadows.sm]}>
            <Text style={styles.statIcon}>{roleLabels[user?.role ?? ''] ?? ''}</Text>
            <Text style={styles.statValue}>•</Text>
            <Text style={styles.statLabel}>Profil</Text>
          </View>
        </View>

        {/* Derniers messages */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Derniers messages</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/messages')}>
            <View style={styles.seeAllRow}>
              <Text style={styles.seeAllText}>Voir tous les messages</Text>
              <ChevronRight size={16} color={Colors.primary} />
            </View>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <Text style={styles.loadingText}>Chargement...</Text>
          </View>
        ) : recentMessages.length === 0 ? (
          <EmptyState
            title="Aucun message"
            description="Vous n'avez pas encore reçu de message."
          />
        ) : (
          <View style={styles.messagesList}>
            {recentMessages.map((msg) => (
              <MessageCard
                key={msg.id}
                message={msg}
                onPress={(id) => router.push(`/messages/${id}`)}
                isUnread={msg.read_status !== 'read'}
              />
            ))}
          </View>
        )}
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
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatarSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarSmallText: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: '600',
    fontFamily: 'system-ui',
  },
  greeting: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.gray900,
    fontFamily: 'system-ui',
  },
  establishment: {
    fontSize: FontSize.xs,
    color: Colors.gray500,
    fontFamily: 'system-ui',
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statValue: {
    fontSize: FontSize['2xl'],
    fontWeight: '700',
    color: Colors.gray900,
    fontFamily: 'system-ui',
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.gray500,
    fontFamily: 'system-ui',
  },
  statIcon: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.secondary,
    fontFamily: 'system-ui',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.gray900,
    fontFamily: 'system-ui',
  },
  seeAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: '500',
    fontFamily: 'system-ui',
  },
  loadingBox: {
    alignItems: 'center',
    paddingVertical: Spacing['3xl'],
  },
  loadingText: {
    color: Colors.gray400,
    fontSize: FontSize.sm,
    fontFamily: 'system-ui',
  },
  messagesList: {
    flex: 1,
  },
});
