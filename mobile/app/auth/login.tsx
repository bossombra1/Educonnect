import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react-native';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '@/theme';
import authService from '@/services/auth.service';

export default function LoginScreen() {
  const [matricule, setMatricule] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const matriculeRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);

  const establishmentName = Constants.expoConfig?.extra?.establishmentSlug ?? 'Votre établissement';

  const handleSubmit = async () => {
    Keyboard.dismiss();
    setError('');

    if (!matricule.trim()) {
      setError('Veuillez saisir votre matricule.');
      return;
    }
    if (!phone.trim() || phone.trim().length < 8) {
      setError('Veuillez saisir un numéro de téléphone valide.');
      return;
    }

    setLoading(true);
    try {
      await authService.requestOtp(matricule.trim(), phone.trim());
      router.push({
        pathname: '/auth/otp',
        params: { matricule: matricule.trim(), phone: phone.trim() },
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Une erreur est survenue. Veuillez réessayer.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.inner}>
          {/* Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>EC</Text>
            </View>
            <Text style={styles.appName}>EduConnect</Text>
            <Text style={styles.establishmentName}>{establishmentName}</Text>
          </View>

          {/* Formulaire */}
          <View style={[styles.card, Shadows.md]}>
            <Text style={styles.cardTitle}>Connexion</Text>
            <Text style={styles.cardSubtitle}>
              Saisissez vos identifiants pour recevoir un code de vérification.
            </Text>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.field}>
              <Text style={styles.label}>Matricule</Text>
              <TextInput
                ref={matriculeRef}
                style={styles.input}
                value={matricule}
                onChangeText={setMatricule}
                placeholder="Ex: 2024-001"
                autoCapitalize="characters"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => phoneRef.current?.focus()}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Numéro de téléphone</Text>
              <View style={styles.phoneRow}>
                <View style={styles.prefixBox}>
                  <Text style={styles.prefixText}>+225</Text>
                </View>
                <TextInput
                  ref={phoneRef}
                  style={[styles.input, styles.phoneInput]}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="07 XX XX XX XX"
                  keyboardType="phone-pad"
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Envoi en cours...' : 'Envoyer le code de vérification'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Note de sécurité */}
          <View style={styles.securityNote}>
            <ShieldCheck size={16} color={Colors.gray400} />
            <Text style={styles.securityText}>
              Vos données sont protégées et chiffrées.
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing['2xl'],
    paddingTop: Spacing['3xl'],
    paddingBottom: Spacing['2xl'],
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: Spacing['3xl'],
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  logoText: {
    color: Colors.white,
    fontSize: FontSize['3xl'],
    fontWeight: '700',
    fontFamily: 'system-ui',
  },
  appName: {
    fontSize: FontSize['2xl'],
    fontWeight: '600',
    color: Colors.primary,
    fontFamily: 'system-ui',
  },
  establishmentName: {
    fontSize: FontSize.sm,
    color: Colors.gray500,
    fontFamily: 'system-ui',
    marginTop: Spacing.xs,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing['2xl'],
  },
  cardTitle: {
    fontSize: FontSize.xl,
    fontWeight: '600',
    color: Colors.gray900,
    fontFamily: 'system-ui',
  },
  cardSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.gray500,
    fontFamily: 'system-ui',
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderLeftWidth: 3,
    borderLeftColor: Colors.danger,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.lg,
  },
  errorText: {
    color: Colors.danger,
    fontSize: FontSize.sm,
    fontFamily: 'system-ui',
  },
  field: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '500',
    color: Colors.gray700,
    marginBottom: Spacing.xs,
    fontFamily: 'system-ui',
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.gray900,
    fontFamily: 'system-ui',
    backgroundColor: Colors.white,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  prefixBox: {
    backgroundColor: Colors.gray100,
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRightWidth: 0,
    borderRadius: BorderRadius.md,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    justifyContent: 'center',
  },
  prefixText: {
    fontSize: FontSize.md,
    fontWeight: '500',
    color: Colors.gray700,
    fontFamily: 'system-ui',
  },
  phoneInput: {
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    flex: 1,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: '600',
    fontFamily: 'system-ui',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xl,
  },
  securityText: {
    fontSize: FontSize.xs,
    color: Colors.gray400,
    fontFamily: 'system-ui',
  },
});
