import React from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, FontSize, BorderRadius } from '@/theme';
import { useMessages } from '@/hooks/useMessages';
import { useConnectivity } from '@/hooks/useConnectivity';
import { useUnreadCount } from './_layout';
import MessageCard from '@/components/shared/MessageCard';
import EmptyState from '@/components/shared/EmptyState';
import OfflineBanner from '@/components/ui/OfflineBanner';
import LoadingScreen from '@/components/ui/LoadingScreen';

export default function MessagesScreen() {
  const { messages, loading, refreshing, hasMore, refresh, loadMore, markAsRead } = useMessages();
  const isConnected = useConnectivity();
  const { refreshUnread } = useUnreadCount();

  const handleMessagePress = async (id: string) => {
    await markAsRead(id);
    await refreshUnread();
    router.push(`/messages/${id}`);
  };

  const handleRefresh = async () => {
    await refresh();
    await refreshUnread();
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <OfflineBanner visible={!isConnected} />

        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Messages</Text>
            <Text style={styles.headerSubtitle}>
              {messages.length > 0 ? `${messages.length} message${messages.length > 1 ? 's' : ''}` : 'Aucun message'}
            </Text>
          </View>
        </View>

        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MessageCard
              message={item}
              onPress={handleMessagePress}
              isUnread={item.read_status !== 'read'}
            />
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.primary}
            />
          }
          onEndReachedThreshold={0.3}
          onEndReached={() => {
            if (hasMore) loadMore();
          }}
          ListEmptyComponent={
            <EmptyState
              title="Aucun message"
              description="Vous n'avez pas encore reçu de message. Les messages de l'établissement apparaîtront ici."
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
});
