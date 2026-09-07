import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Bell, ChevronRight, MessageCircle } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Colors, Spacing, FontSize, BorderRadius } from '@/theme';
import { useAuth } from '@/hooks/useAuth';
import messageService from '@/services/message.service';
import MessageCard from '@/components/shared/MessageCard';
import EmptyState from '@/components/shared/EmptyState';
import type { Message } from '@/types';
import type { AppTabParamList } from '@/navigation/types';
import { useUnreadCount } from '@/navigation/UnreadContext';

export default function HomeScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<AppTabParamList>>();
  const { user } = useAuth();
  const { unreadCount, refreshUnread } = useUnreadCount();
  const [messages, setMessages] = useState<Message[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { setMessages((await messageService.getMessages(1, 3)).data); } catch { /* offline */ }
    await refreshUnread();
  }, [refreshUnread]);
  useEffect(() => { void load(); }, [load]);

  const displayName = user?.full_name ?? 'Utilisateur';
  const firstName = displayName.split(' ').pop() ?? displayName;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';
  const role = user?.role === 'parent' ? 'Parent' : user?.role === 'student' ? 'Élève' : 'Personnel';

  return <ScrollView style={styles.container} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={Colors.primary} />}>
    <View style={styles.header}>
      <View style={styles.identity}><View style={styles.avatar}><Text style={styles.avatarText}>{displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}</Text></View><View><Text style={styles.greeting}>{greeting} {firstName}</Text><Text style={styles.role}>{role}</Text></View></View>
      <TouchableOpacity onPress={() => navigation.navigate('Notifications')}><Bell size={23} color={Colors.gray600} /></TouchableOpacity>
    </View>
    <View style={styles.stats}>
      <View style={styles.stat}><MessageCircle size={20} color={Colors.primary} /><Text style={styles.value}>{unreadCount}</Text><Text style={styles.label}>Non lus</Text></View>
      <View style={styles.stat}><Bell size={20} color={Colors.secondary} /><Text style={styles.value}>{messages.length}</Text><Text style={styles.label}>Récents</Text></View>
      <View style={styles.stat}><Text style={styles.roleValue}>{role}</Text><Text style={styles.value}>•</Text><Text style={styles.label}>Profil</Text></View>
    </View>
    <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Derniers messages</Text><TouchableOpacity style={styles.seeAll} onPress={() => navigation.navigate('Messages')}><Text style={styles.seeAllText}>Voir tout</Text><ChevronRight size={16} color={Colors.primary} /></TouchableOpacity></View>
    {messages.length === 0 ? <EmptyState title="Aucun message" description="Vous n'avez pas encore reçu de message." /> : messages.map((message) => <MessageCard key={message.id} message={message} isUnread={message.read_status !== 'read'} onPress={() => { navigation.navigate('Messages'); }} />)}
  </ScrollView>;
}

const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: Colors.background }, content: { padding: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing['3xl'] }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xl }, identity: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md }, avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' }, avatarText: { color: Colors.white, fontWeight: '800' }, greeting: { color: Colors.gray900, fontSize: FontSize.lg, fontWeight: '700' }, role: { color: Colors.gray500, fontSize: FontSize.xs, marginTop: 2 }, stats: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl }, stat: { flex: 1, minHeight: 112, backgroundColor: Colors.white, borderRadius: BorderRadius.xl, alignItems: 'center', justifyContent: 'center', gap: 4 }, value: { color: Colors.gray900, fontSize: FontSize.xl, fontWeight: '800' }, roleValue: { color: Colors.secondary, fontSize: FontSize.xs, fontWeight: '700' }, label: { color: Colors.gray500, fontSize: FontSize.xs }, sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md }, sectionTitle: { color: Colors.gray900, fontSize: FontSize.lg, fontWeight: '700' }, seeAll: { flexDirection: 'row', alignItems: 'center' }, seeAllText: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: '600' } });
