import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { router } from 'expo-router';
import { theme } from '@/theme';

export default function WelcomeScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <View style={styles.logoPlaceholder}>
            <Text style={styles.logoText}>EC</Text>
          </View>
        </View>

        <Text style={styles.appName}>EduConnect</Text>
        <Text style={styles.schoolName}>Groupe Scolaire La Réussite</Text>
        <Text style={styles.description}>
          Plateforme officielle de communication scolaire.
          Recevez les messages, annonces et documents de l'établissement en temps réel.
        </Text>

        <View style={styles.features}>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>📱</Text>
            <Text style={styles.featureText}>Notifications instantanées</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🔒</Text>
            <Text style={styles.featureText}>Données sécurisées RGPD</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>📴</Text>
            <Text style={styles.featureText}>Consultation hors-ligne</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push('/auth/login')}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Commencer</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>v1.0.0 — EduConnect</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.Colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logoContainer: {
    marginBottom: 24,
  },
  logoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 24,
    backgroundColor: theme.Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 40,
    fontWeight: '800',
    color: theme.Colors.white,
    letterSpacing: 2,
  },
  appName: {
    fontSize: 36,
    fontWeight: '800',
    color: theme.Colors.primary,
    marginBottom: 4,
  },
  schoolName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.Colors.gray700,
    marginBottom: 24,
  },
  description: {
    fontSize: 15,
    color: theme.Colors.gray500,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    maxWidth: 320,
  },
  features: {
    width: '100%',
    marginBottom: 40,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  featureText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.Colors.gray800,
  },
  button: {
    backgroundColor: theme.Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 60,
    marginBottom: 24,
  },
  buttonText: {
    color: theme.Colors.white,
    fontSize: 18,
    fontWeight: '700',
  },
  footer: {
    color: theme.Colors.gray400,
    fontSize: 13,
  },
});
