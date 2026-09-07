import React, { useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { KeyRound, ShieldCheck, UserRound } from 'lucide-react-native';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '@/theme';
import authService from '@/services/auth.service';
import type { MobileRole } from '@/types';
import type { AuthStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

const ROLE_LABELS: Record<MobileRole, string> = { parent: 'Parent', student: 'Élève', staff: 'Personnel' };

export default function LoginScreen({ navigation }: Props) {
  const [role, setRole] = useState<MobileRole>('parent');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const passwordRef = useRef<TextInput>(null);

  const handleRoleChange = (nextRole: MobileRole) => {
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
      if (result.otpRequired) {
        navigation.navigate('Otp', {
          phone: result.phone,
          role,
          firstConnection: true,
          ...(result.matricule ? { matricule: result.matricule } : {}),
        });
        return;
      }
      // RootNavigator will switch to App after the session is stored.
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Identifiant ou mot de passe incorrect.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.inner}>
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}><Text style={styles.logoText}>EC</Text></View>
          <Text style={styles.appName}>EduConnect</Text>
          <Text style={styles.establishmentName}>Votre établissement</Text>
        </View>

        <View style={[styles.card, Shadows.md]}>
          <Text style={styles.cardTitle}>Connexion</Text>
          <Text style={styles.cardSubtitle}>Identifiez-vous. EduConnect détecte automatiquement votre première connexion.</Text>

          <View style={styles.roleRow}>
            {(['parent', 'student', 'staff'] as MobileRole[]).map((item) => (
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
            <TextInput ref={passwordRef} style={styles.input} value={password} onChangeText={setPassword} placeholder="Votre mot de passe" secureTextEntry returnKeyType="done" onSubmitEditing={handleLogin} />
          </View>

          <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleLogin} disabled={loading} activeOpacity={0.8}>
            <KeyRound size={18} color={Colors.white} />
            <Text style={styles.buttonText}>{loading ? 'Vérification...' : `Se connecter — ${ROLE_LABELS[role]}`}</Text>
          </TouchableOpacity>

          <Text style={styles.firstLoginHint}>Compte non activé ? Un code OTP sera automatiquement demandé après vérification de votre mot de passe.</Text>
        </View>

        <View style={styles.securityNote}>
          <ShieldCheck size={16} color={Colors.gray400} />
          <Text style={styles.securityText}>Parcours séparés pour Parent, Élève et Personnel.</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing['2xl'], paddingVertical: Spacing['2xl'] },
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
