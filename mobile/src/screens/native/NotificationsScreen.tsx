import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Bell } from 'lucide-react-native';
import { format, isToday, isYesterday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Colors, Spacing, FontSize, BorderRadius } from '@/theme';
import { useConnectivity } from '@/hooks/useConnectivity';
import notificationService from '@/services/notification.service';
import EmptyState from '@/components/shared/EmptyState';
import OfflineBanner from '@/components/ui/OfflineBanner';
import type { Notification as AppNotification } from '@/types';

export default function NotificationsScreen() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const connected = useConnectivity();
  const load = useCallback(async () => { try { setItems((await notificationService.getUserNotifications(1, 50)).data); } catch { /* offline */ } }, []);
  useEffect(() => { void (async () => { await load(); setLoading(false); })(); }, [load]);
  const markRead = async (id: string) => { setItems((prev) => prev.map((item) => item.id === id ? { ...item, read: true } : item)); try { await notificationService.markNotificationAsRead(id); } catch { /* keep optimistic state */ } };
  const dateLabel = (value: string) => { const date = new Date(value); if (isToday(date)) return "Aujourd'hui"; if (isYesterday(date)) return 'Hier'; return format(date, 'd MMM yyyy', { locale: fr }); };
  if (loading) return <View style={styles.loading}><Text style={styles.loadingText}>Chargement...</Text></View>;
  return <View style={styles.container}><OfflineBanner visible={!connected} /><View style={styles.header}><Text style={styles.title}>Notifications</Text><Text style={styles.subtitle}>{items.filter((item) => !item.read).length} non lue{items.filter((item) => !item.read).length > 1 ? 's' : ''}</Text></View><FlatList data={items} keyExtractor={(item) => item.id} contentContainerStyle={styles.list} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={Colors.primary} />} renderItem={({ item }) => <TouchableOpacity style={[styles.card, !item.read && styles.unread]} onPress={() => void markRead(item.id)} activeOpacity={0.75}><Bell size={19} color={item.read ? Colors.gray400 : Colors.primary} /><View style={styles.content}><Text style={[styles.cardTitle, !item.read && styles.bold]}>{item.title}</Text><Text style={styles.body}>{item.body}</Text><Text style={styles.date}>{dateLabel(item.created_at)}</Text></View>{!item.read ? <View style={styles.dot} /> : null}</TouchableOpacity>} ListEmptyComponent={<EmptyState title="Aucune notification" description="Vos notifications apparaîtront ici." />} /></View>;
}
const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: Colors.background }, loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background }, loadingText: { color: Colors.gray400 }, header: { padding: Spacing.lg, paddingTop: Spacing.xl }, title: { color: Colors.gray900, fontSize: FontSize['2xl'], fontWeight: '800' }, subtitle: { color: Colors.gray500, fontSize: FontSize.sm, marginTop: 2 }, list: { padding: Spacing.lg, paddingTop: 0 }, card: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: Spacing.lg, marginBottom: Spacing.md }, unread: { borderLeftWidth: 4, borderLeftColor: Colors.primary }, content: { flex: 1 }, cardTitle: { color: Colors.gray800, fontSize: FontSize.md, fontWeight: '500' }, bold: { fontWeight: '800' }, body: { color: Colors.gray600, fontSize: FontSize.sm, lineHeight: 20, marginTop: 4 }, date: { color: Colors.gray400, fontSize: FontSize.xs, marginTop: 6 }, dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary, marginTop: 4 } });
