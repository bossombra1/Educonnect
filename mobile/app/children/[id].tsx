import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { ArrowLeft, GraduationCap, Clock } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '@/theme';

export default function ChildDetailScreen() {
  const { id, name, className, matricule } = useLocalSearchParams<{
    id: string;
    name?: string;
    className?: string;
    matricule?: string;
  }>();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color={Colors.primary} />
        </TouchableOpacity>

        <View style={styles.content}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(name ?? '??').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
            </Text>
          </View>

          <Text style={styles.childName}>{name ?? 'Enfant'}</Text>

          <View style={[styles.infoRow, Shadows.sm]}>
            <GraduationCap size={20} color={Colors.primary} />
            <View>
              <Text style={styles.infoLabel}>Classe</Text>
              <Text style={styles.infoValue}>{className ?? '—'}</Text>
            </View>
          </View>

          <View style={[styles.infoRow, Shadows.sm]}>
            <Text style={styles.matriculeIcon}>#</Text>
            <View>
              <Text style={styles.infoLabel}>Matricule</Text>
              <Text style={styles.infoValue}>{matricule ?? '—'}</Text>
            </View>
          </View>

          <View style={styles.placeholderBox}>
            <Clock size={32} color={Colors.gray300} />
            <Text style={styles.placeholderTitle}>Bientôt disponible</Text>
            <Text style={styles.placeholderText}>
              Moyennes et emploi du temps bientôt disponibles.
            </Text>
          </View>
        </View>
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
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: Spacing.sm,
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
  },
  content: {
    alignItems: 'center',
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
  childName: {
    fontSize: FontSize.xl,
    fontWeight: '600',
    color: Colors.gray900,
    fontFamily: 'system-ui',
    marginBottom: Spacing.xl,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
    width: '100%',
    marginBottom: Spacing.md,
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
  matriculeIcon: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.primary,
    fontFamily: 'system-ui',
    width: 24,
    textAlign: 'center',
  },
  placeholderBox: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing['3xl'],
    alignItems: 'center',
    marginTop: Spacing['2xl'],
  },
  placeholderTitle: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.gray700,
    fontFamily: 'system-ui',
    marginTop: Spacing.md,
  },
  placeholderText: {
    fontSize: FontSize.sm,
    color: Colors.gray500,
    fontFamily: 'system-ui',
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
});
