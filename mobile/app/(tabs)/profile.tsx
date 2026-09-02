import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Settings,
  ChevronRight,
  GraduationCap,
  ShieldCheck,
} from 'lucide-react-native';
import { router } from 'expo-router';
import {
  Colors,
  Spacing,
  FontSize,
  BorderRadius,
  Shadows,
} from '@/theme';
import { useAuth } from '@/hooks/useAuth';
import type { Child } from '@/types';
import apiClient from '@/services/api';

type BackendChild = {
  student_id: number | string;
  first_name?: string | null;
  last_name?: string | null;
  matricule_scolaire?: string | null;
  class_name?: string | null;
  avatar_url?: string | null;
};

type ProfileResponse = {
  success: boolean;
  data: {
    establishment_name?: string | null;
    children?: BackendChild[];
  };
};

const roleLabels: Record<string, string> = {
  parent: 'Parent',
  student: 'Élève',
  staff: 'Personnel',
  admin: 'Administrateur',
};

function normalizeChild(child: BackendChild): Child {
  const fullName = [child.first_name?.trim(), child.last_name?.trim()]
    .filter(Boolean)
    .join(' ')
    .trim();

  return {
    id: String(child.student_id),
    matricule: child.matricule_scolaire ?? '',
    full_name: fullName || child.matricule_scolaire || 'Élève',
    class_name: child.class_name ?? 'Classe non renseignée',
    ...(child.avatar_url ? { avatar_url: child.avatar_url } : {}),
  };
}

export default function ProfileScreen() {
  const { user } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [profileEstablishmentName, setProfileEstablishmentName] = useState('');

  const displayName = user?.full_name ?? 'Utilisateur';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      try {
        const { data } = await apiClient.get<ProfileResponse>('/auth/profile');
        if (!mounted) return;
        setProfileEstablishmentName(data.data.establishment_name?.trim() ?? '');
        if (user?.role === 'parent') {
          setChildren((data.data.children ?? []).map(normalizeChild));
        }
      } catch {
        // Le profil local reste affiché si le réseau est indisponible.
      }
    };

    if (user) void loadProfile();
    return () => {
      mounted = false;
    };
  }, [user?.role]);

  const establishmentName = profileEstablishmentName || user?.establishment_name || 'Établissement';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{displayName}</Text>
          <View style={styles.roleBadge}>
            <ShieldCheck size={14} color={Colors.primary} />
            <Text style={styles.roleText}>
              {roleLabels[user?.role ?? ''] ?? 'Utilisateur'}
            </Text>
          </View>
          {user?.matricule ? (
            <Text style={styles.matricule}>Matricule : {user.matricule}</Text>
          ) : null}
        </View>

        <View style={[styles.infoCard, Shadows.sm]}>
          <GraduationCap size={20} color={Colors.primary} />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Établissement</Text>
            <Text style={styles.infoValue}>{establishmentName}</Text>
          </View>
        </View>

        {user?.role === 'parent' && children.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mes enfants</Text>
            {children.map((child) => (
              <TouchableOpacity
                key={child.id}
                style={[styles.childCard, Shadows.sm]}
                onPress={() => router.push({ pathname: `/children/${child.id}`, params: { name: child.full_name, className: child.class_name, matricule: child.matricule } })}
                activeOpacity={0.7}
              >
                <View style={styles.childAvatar}>
                  <Text style={styles.childAvatarText}>
                    {child.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.childInfo}>
                  <Text style={styles.childName}>{child.full_name}</Text>
                  <Text style={styles.childClass}>{child.class_name}</Text>
                  <Text style={styles.childMatricule}>Matricule : {child.matricule}</Text>
                </View>
                <ChevronRight size={20} color={Colors.gray300} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.v2Note}>
          <Text style={styles.v2NoteText}>V2 : moyennes et emploi du temps bientôt disponibles.</Text>
        </View>

        <TouchableOpacity
          style={[styles.settingsRow, Shadows.sm]}
          onPress={() => router.push('/settings')}
        >
          <Settings size={20} color={Colors.gray600} />
          <Text style={styles.settingsText}>Paramètres</Text>
          <ChevronRight size={20} color={Colors.gray300} />
        </TouchableOpacity>
      </ScrollView>
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
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing['3xl'],
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  avatarText: {
    color: Colors.white,
    fontSize: FontSize['3xl'],
    fontWeight: '700',
    fontFamily: 'system-ui',
  },
  name: {
    fontSize: FontSize.xl,
    fontWeight: '600',
    color: Colors.gray900,
    fontFamily: 'system-ui',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.sm,
  },
  roleText: {
    fontSize: FontSize.sm,
    fontWeight: '500',
    color: Colors.primary,
    fontFamily: 'system-ui',
  },
  matricule: {
    fontSize: FontSize.sm,
    color: Colors.gray500,
    fontFamily: 'system-ui',
    marginTop: Spacing.xs,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: FontSize.xs,
    color: Colors.gray500,
    fontFamily: 'system-ui',
  },
  infoValue: {
    fontSize: FontSize.md,
    fontWeight: '500',
    color: Colors.gray800,
    fontFamily: 'system-ui',
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.gray700,
    fontFamily: 'system-ui',
    marginBottom: Spacing.md,
  },
  childCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  childAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  childAvatarText: {
    color: Colors.primary,
    fontSize: FontSize.sm,
    fontWeight: '600',
    fontFamily: 'system-ui',
  },
  childInfo: {
    flex: 1,
  },
  childName: {
    fontSize: FontSize.md,
    fontWeight: '500',
    color: Colors.gray800,
    fontFamily: 'system-ui',
  },
  childClass: {
    fontSize: FontSize.sm,
    color: Colors.gray500,
    fontFamily: 'system-ui',
  },
  childMatricule: {
    fontSize: FontSize.xs,
    color: Colors.gray400,
    fontFamily: 'system-ui',
  },
  v2Note: {
    backgroundColor: '#F0FDF4',
    borderLeftWidth: 3,
    borderLeftColor: Colors.secondary,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.xl,
  },
  v2NoteText: {
    fontSize: FontSize.sm,
    color: Colors.secondary,
    fontFamily: 'system-ui',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  settingsText: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.gray700,
    fontFamily: 'system-ui',
  },
});
