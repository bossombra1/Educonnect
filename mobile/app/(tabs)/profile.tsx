import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { ShieldCheck, GraduationCap, ChevronRight, Settings } from 'lucide-react-native';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '@/theme';
import authService from '@/services/auth.service';
import type { User, Child } from '@/types';

type ProfileChild = Record<string, unknown>;

export default function ProfileScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [children, setChildren] = useState<Child[]>([]);

  useEffect(() => {
    void (async () => {
      const stored = await authService.getStoredUser();
      setUser(stored);
      if (stored?.role === 'parent') {
        const profile = await authService.getProfile().catch(() => null);
        if (profile?.role === 'parent') {
          const rawChildren = (profile.children ?? []) as unknown as ProfileChild[];
          setChildren(rawChildren.map((child) => ({
            id: String(child.student_id ?? child.id ?? ''),
            matricule: String(child.matricule_scolaire ?? child.matricule ?? ''),
            full_name: [child.first_name, child.last_name].filter(Boolean).join(' ') || String(child.full_name ?? ''),
            class_name: String(child.class_name ?? ''),
            ...(child.avatar_url ? { avatar_url: String(child.avatar_url) } : {}),
          })).filter((child) => child.id));
        }
      }
    })();
  }, []);

  const establishmentName = user?.establishment_name ?? 'Votre établissement';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{user?.full_name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'EC'}</Text></View>
        <Text style={styles.name}>{user?.full_name ?? 'Utilisateur'}</Text>
        <Text style={styles.role}>{user?.role === 'parent' ? 'Parent' : user?.role === 'student' ? 'Élève' : 'Personnel'}</Text>
      </View>
      <View style={[styles.card, Shadows.sm]}>
        <View style={styles.infoRow}><ShieldCheck size={14} color={Colors.primary} /><View style={styles.infoContent}><Text style={styles.infoLabel}>Matricule</Text><Text style={styles.infoValue}>{user?.matricule ?? '—'}</Text></View></View>
        <View style={styles.infoRow}><GraduationCap size={20} color={Colors.primary} /><View style={styles.infoContent}><Text style={styles.infoLabel}>Établissement</Text><Text style={styles.infoValue}>{establishmentName}</Text></View></View>
      </View>
      {user?.role === 'parent' && children.length > 0 && <View style={styles.section}><Text style={styles.sectionTitle}>Mes enfants</Text>{children.map((child) => <TouchableOpacity key={child.id} style={[styles.childCard, Shadows.sm]} onPress={() => router.push({ pathname: '/children/[id]', params: { id: child.id, name: child.full_name, className: child.class_name, matricule: child.matricule } })} activeOpacity={0.7}><View style={styles.childAvatar}><Text style={styles.childAvatarText}>{child.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}</Text></View><View style={styles.childContent}><Text style={styles.childName}>{child.full_name}</Text><Text style={styles.childDetails}>{child.class_name || 'Classe non renseignée'} · {child.matricule}</Text></View><ChevronRight size={20} color={Colors.gray300} /></TouchableOpacity>)}</View>}
      <TouchableOpacity style={styles.settingsRow} onPress={() => router.push('/settings')}><Settings size={20} color={Colors.gray600} /><Text style={styles.settingsText}>Paramètres</Text><ChevronRight size={20} color={Colors.gray300} /></TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background }, content: { padding: Spacing.xl, paddingBottom: Spacing['3xl'] }, header: { alignItems: 'center', marginBottom: Spacing.xl }, avatar: { width: 84, height: 84, borderRadius: 42, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md }, avatarText: { color: Colors.white, fontSize: FontSize.xl, fontWeight: '700' }, name: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.gray900 }, role: { marginTop: Spacing.xs, fontSize: FontSize.sm, color: Colors.gray500 }, card: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.xl }, infoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md }, infoContent: { flex: 1 }, infoLabel: { fontSize: FontSize.xs, color: Colors.gray500 }, infoValue: { marginTop: 2, fontSize: FontSize.md, color: Colors.gray900, fontWeight: '600' }, section: { marginBottom: Spacing.xl }, sectionTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.gray900, marginBottom: Spacing.md }, childCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm }, childAvatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center' }, childAvatarText: { color: Colors.primary, fontWeight: '700' }, childContent: { flex: 1, marginLeft: Spacing.md }, childName: { fontSize: FontSize.md, fontWeight: '600', color: Colors.gray900 }, childDetails: { marginTop: 3, fontSize: FontSize.xs, color: Colors.gray500 }, settingsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.lg }, settingsText: { flex: 1, marginLeft: Spacing.md, fontSize: FontSize.md, color: Colors.gray700, fontWeight: '500' },
});
