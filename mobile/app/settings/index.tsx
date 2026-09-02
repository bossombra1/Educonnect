import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { ArrowLeft, Bell, Shield, Info, LogOut } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '@/theme';
import { useAuth } from '@/hooks/useAuth';

const establishmentName = Constants.expoConfig?.extra?.establishmentSlug ?? 'Votre établissement';

export default function SettingsScreen() {
  const { logout } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const handleToggleNotifications = (value: boolean) => {
    setNotificationsEnabled(value);
  };

  const handleLogout = () => {
    Alert.alert(
      'Se déconnecter',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Se déconnecter',
          style: 'destructive',
          onPress: () => logout(),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* En-tête */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Paramètres</Text>
        </View>

        {/* Notifications */}
        <View style={[styles.card, Shadows.sm]}>
          <View style={styles.cardRow}>
            <View style={styles.cardIcon}>
              <Bell size={20} color={Colors.primary} />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Notifications</Text>
              <Text style={styles.cardSubtitle}>Recevoir les alertes de messages</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: Colors.gray200, true: Colors.primaryLight }}
              thumbColor={Colors.white}
            />
          </View>
        </View>

        {/* Établissement */}
        <View style={[styles.card, Shadows.sm]}>
          <View style={styles.cardRow}>
            <View style={styles.cardIcon}>
              <Info size={20} color={Colors.primary} />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Établissement</Text>
              <Text style={styles.cardSubtitle}>{establishmentName}</Text>
            </View>
          </View>
        </View>

        {/* RGPD */}
        <View style={styles.rgpdBox}>
          <Shield size={16} color={Colors.secondary} />
          <Text style={styles.rgpdTitle}>Données et Sécurité</Text>
          <Text style={styles.rgpdText}>
            Vos données sont traitées conformément au RGPD. Vous pouvez demander la suppression de vos données en contactant l'administration de l'établissement.
          </Text>
        </View>

        {/* Version */}
        <Text style={styles.version}>EduConnect v1.0.0</Text>

        {/* Déconnexion */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.7}>
          <LogOut size={18} color={Colors.danger} />
          <Text style={styles.logoutText}>Se déconnecter</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: '600',
    color: Colors.gray900,
    fontFamily: 'system-ui',
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: FontSize.md,
    fontWeight: '500',
    color: Colors.gray800,
    fontFamily: 'system-ui',
  },
  cardSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.gray500,
    fontFamily: 'system-ui',
  },
  rgpdBox: {
    backgroundColor: '#F0FDF4',
    borderLeftWidth: 3,
    borderLeftColor: Colors.secondary,
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.xl,
    gap: Spacing.xs,
  },
  rgpdTitle: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.secondary,
    fontFamily: 'system-ui',
  },
  rgpdText: {
    fontSize: FontSize.sm,
    color: Colors.gray600,
    fontFamily: 'system-ui',
    lineHeight: 20,
  },
  version: {
    textAlign: 'center',
    fontSize: FontSize.xs,
    color: Colors.gray400,
    fontFamily: 'system-ui',
    marginBottom: Spacing.xl,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: '#FEF2F2',
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  logoutText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.danger,
    fontFamily: 'system-ui',
  },
});
