import React, { useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { ShieldCheck, KeyRound, UserRound } from 'lucide-react-native';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '@/theme';
import authService from '@/services/auth.service';
import type { MobileRole } from '@/types';

type LoginRole = MobileRole;

type FirstLoginOtp = {
  otpRequired: true;
  role: 'PARENT' | 'STUDENT' | 'STAFF';
  phone: string;
  matricule: string | null;
  message: string;
};

const ROLE_LABELS: Record<LoginRole, string> = { parent: 'Parent', student: 'Élève', staff: 'Personnel' };
const BACKEND_ROLES: Record<LoginRole, FirstLoginOtp['role']> = { parent: 'PARENT', student: 'STUDENT', staff: 'STAFF' };

export default function LoginScreen() {
  const [role, setRole] = useState<LoginRole>('parent');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const identifierRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const establishmentName = Constants.expoConfig?.extra?.establishmentSlug ?? 'Votre établissement';

  const handleRoleChange = (nextRole: LoginRole) => {
    setRole(nextRole);
    setIdentifier('');
    setPassword('');
    setError('');
  };

  const handleLogin = async () => {
    Keyboard.dismiss();
    setError('');
    const cleanIdentifier = identifier.trim();

    if (!cleanIdentifier) {
      setError(role === 'parent' ? 'Veuillez saisir votre numéro de téléphone.' : 'Veuillez saisir votre matricule.');
      return;
    }
    if (!password) {
      setError('Veuillez saisir votre mot de passe.');
      return;
    }

    setLoading(true);
    try {
      const result = await authService.loginWithPassword(role, cleanIdentifier, password);

      if ('otpRequired' in result && result.otpRequired) {
        router.push({
          pathname: '/auth/otp',
          params: {
            phone: result.phone,
            role,
            firstConnection: 'true',
            ...(result.matricule ? { matricule: result.matricule } : {}),
          },
        });
        return;
      }

      router.replace('/(tabs)');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Identifiant ou mot de passe incorrect.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.inner}>
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}><Text style={styles.logoText}>EC</Text></View>
            <Text style={styles.appName}>EduConnect</Text>
            <Text style={styles.establishmentName}>{establishmentName}</Text>
          </View>

          <View style={[styles.card, Shadows.md]}>
            <Text style={styles.cardTitle}>Connexion</Text>
            <Text style={styles.cardSubtitle}>Identifiez-vous. EduConnect détecte automatiquement s’il s’agit de votre première connexion.</Text>

            <View style={styles.roleRow}>
              {(['parent', 'student', 'staff'] as LoginRole[]).map((item) => (
                <TouchableOpacity key={item} style={[styles.roleButton, role === item && styles.roleButtonActive]} onPress={() => handleRoleChange(item)} activeOpacity={0.8}>
                  <UserRound size={16} color={role === item ? Colors.white : Colors.gray500} />
                  <Text style={[styles.roleText, role === item && styles.roleTextActive]}>{ROLE_LABELS[item]}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

            <View style={styles.field}>
              <Text style={styles.label}>{role === 'parent' ? 'Numéro de téléphone' : 'Matricule'}</Text>
              <TextInput
                ref={identifierRef}
                style={styles.input}
                value={identifier}
                onChangeText={setIdentifier}
                placeholder={role === 'parent' ? '+225 07 XX XX XX XX' : role === 'student' ? 'ELE-2026-001' : 'PER-2026-001'}
                keyboardType={role === 'parent' ? 'phone-pad' : 'default'}
                autoCapitalize={role === 'parent' ? 'none' : 'characters'}
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Mot de passe</Text>
              <TextInput
                ref={passwordRef}
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Votre mot de passe"
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
            </View>

            <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleLogin} disabled={loading} activeOpacity={0.8}>
              <KeyRound size={18} color={Colors.white} />
              <Text style={styles.buttonText}>{loading ? 'Vérification...' : `Se connecter — ${ROLE_LABELS[role]}`}</Text>
            </TouchableOpacity>

            <Text style={styles.firstLoginHint}>Si votre compte n’est pas encore activé, un code OTP vous sera automatiquement demandé après vérification de votre mot de passe.</Text>
          </View>

          <View style={styles.securityNote}>
            <ShieldCheck size={16} color={Colors.gray400} />
            <Text style={styles.securityText}>Parent, Élève et Personnel disposent de parcours d’authentification séparés.</Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing['2xl'], paddingTop: Spacing['3xl'], paddingBottom: Spacing['2xl'] },
  logoContainer: { alignItems: 'center', marginBottom: Spacing['3xl'] },
  logoCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md },
  logoText: { color: Colors.white, fontSize: FontSize['3xl'], fontWeight: '700' },
  appName: { fontSize: FontSize['2xl'], fontWeight: '600', color: Colors.primary },
  establishmentName: { fontSize: FontSize.sm, color: Colors.gray500, marginTop: Spacing.xs },
  card: { backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: Spacing['2xl'] },
  cardTitle: { fontSize: FontSize.xl, fontWeight: '600', color: Colors.gray900 },
  cardSubtitle: { fontSize: FontSize.sm, color: Colors.gray500, marginTop: Spacing.xs, marginBottom: Spacing.lg, lineHeight: 20 },
  roleRow: { flexDirection: 'row', gap: Spacing.xs, marginBottom: Spacing.lg },
  roleButton: { flex: 1, minHeight: 44, paddingVertical: Spacing.sm, borderWidth: 1, borderColor: Colors.gray200, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: Spacing.xs },
  roleButtonActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  roleText: { fontSize: FontSize.xs, color: Colors.gray600, fontWeight: '600' },
  roleTextActive: { color: Colors.white },
  errorBox: { backgroundColor: '#FEF2F2', borderLeftWidth: 3, borderLeftColor: Colors.danger, padding: Spacing.md, borderRadius: BorderRadius.sm, marginBottom: Spacing.lg },
  errorText: { color: Colors.danger, fontSize: FontSize.sm },
  field: { marginBottom: Spacing.lg },
  label: { fontSize: FontSize.sm, fontWeight: '500', color: Colors.gray700, marginBottom: Spacing.xs },
  input: { borderWidth: 1, borderColor: Colors.gray200, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, fontSize: FontSize.md, color: Colors.gray900, backgroundColor: Colors.white },
  button: { backgroundColor: Colors.primary, borderRadius: BorderRadius.md, paddingVertical: Spacing.lg, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: Colors.white, fontSize: FontSize.md, fontWeight: '600' },
  firstLoginHint: { fontSize: FontSize.xs, color: Colors.gray400, lineHeight: 18, textAlign: 'center', marginTop: Spacing.lg },
  securityNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, marginTop: Spacing.xl },
  securityText: { fontSize: FontSize.xs, color: Colors.gray400, textAlign: 'center', flex: 1 },
});
