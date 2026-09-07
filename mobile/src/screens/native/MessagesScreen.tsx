import React from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Colors, Spacing, FontSize } from '@/theme';
import { useMessages } from '@/hooks/useMessages';
import { useConnectivity } from '@/hooks/useConnectivity';
import MessageCard from '@/components/shared/MessageCard';
import EmptyState from '@/components/shared/EmptyState';
import OfflineBanner from '@/components/ui/OfflineBanner';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { useUnreadCount } from '@/navigation/UnreadContext';

export default function MessagesScreen() {
  const { messages, loading, refreshing, hasMore, refresh, loadMore, markAsRead } = useMessages();
  const connected = useConnectivity();
  const { refreshUnread } = useUnreadCount();
  if (loading) return <LoadingScreen />;
  return <View style={styles.container}>
    <OfflineBanner visible={!connected} />
    <View style={styles.header}><Text style={styles.title}>Messages</Text><Text style={styles.subtitle}>{messages.length ? `${messages.length} message${messages.length > 1 ? 's' : ''}` : 'Aucun message'}</Text></View>
    <FlatList data={messages} keyExtractor={(item) => item.id} contentContainerStyle={styles.list} renderItem={({ item }) => <MessageCard message={item} isUnread={item.read_status !== 'read'} onPress={async (id) => { await markAsRead(id); await refreshUnread(); }} />} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { await refresh(); await refreshUnread(); }} tintColor={Colors.primary} />} onEndReached={() => { if (hasMore) void loadMore(); }} onEndReachedThreshold={0.3} ListEmptyComponent={<EmptyState title="Aucun message" description="Les messages de l'établissement apparaîtront ici." />} />
  </View>;
}
const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: Colors.background }, header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.md }, title: { fontSize: FontSize['2xl'], fontWeight: '800', color: Colors.gray900 }, subtitle: { marginTop: 2, fontSize: FontSize.sm, color: Colors.gray500 }, list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing['3xl'] } });
