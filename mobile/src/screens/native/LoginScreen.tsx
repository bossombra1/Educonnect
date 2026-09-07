import React, { useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { KeyRound, ShieldCheck, UserRound } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Spacing, FontSize, BorderRadius } from '@/theme';
import authService from '@/services/auth.service';
import type { MobileRole } from '@/types';
import type { AuthStackParamList } from '@/navigation/types';

type Navigation = NativeStackNavigationProp<AuthStackParamList, 'Login'>;
const ROLE_LABELS: Record<MobileRole, string> = { parent: 'Parent', student: 'Élève', staff: 'Personnel' };

export default function LoginScreen() {
  const navigation = useNavigation<Navigation>();
  const [role, setRole] = useState<MobileRole>('parent');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const passwordRef = useRef<TextInput>(null);

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
          ...(result.matricule ? { matricule: result.matricule } : {}),
        });
      }
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
            <View style={styles.logo}><Text style={styles.logoText}>EC</Text></View>
            <Text style={styles.appName}>EduConnect</Text>
            <Text style={styles.subtitle}>Votre espace scolaire</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.title}>Connexion</Text>
            <Text style={styles.description}>Choisissez votre espace et identifiez-vous.</Text>
            <View style={styles.roleRow}>
              {(['parent', 'student', 'staff'] as MobileRole[]).map((item) => (
                <TouchableOpacity key={item} style={[styles.roleButton, role === item && styles.roleActive]} onPress={() => { setRole(item); setIdentifier(''); setPassword(''); setError(''); }}>
                  <UserRound size={16} color={role === item ? Colors.white : Colors.gray500} />
                  <Text style={[styles.roleText, role === item && styles.roleTextActive]}>{ROLE_LABELS[item]}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {error ? <View style={styles.error}><Text style={styles.errorText}>{error}</Text></View> : null}
            <Text style={styles.label}>{role === 'parent' ? 'Numéro de téléphone' : 'Matricule'}</Text>
            <TextInput style={styles.input} value={identifier} onChangeText={setIdentifier} placeholder={role === 'parent' ? '+225 07 XX XX XX XX' : role === 'student' ? 'ELE-2026-001' : 'PER-2026-001'} keyboardType={role === 'parent' ? 'phone-pad' : 'default'} autoCapitalize={role === 'parent' ? 'none' : 'characters'} autoCorrect={false} returnKeyType="next" onSubmitEditing={() => passwordRef.current?.focus()} />
            <Text style={styles.label}>Mot de passe</Text>
            <TextInput ref={passwordRef} style={styles.input} value={password} onChangeText={setPassword} placeholder="Votre mot de passe" secureTextEntry returnKeyType="done" onSubmitEditing={handleLogin} />
            <TouchableOpacity style={[styles.button, loading && styles.disabled]} onPress={handleLogin} disabled={loading}>
              <KeyRound size={18} color={Colors.white} /><Text style={styles.buttonText}>{loading ? 'Vérification...' : `Se connecter — ${ROLE_LABELS[role]}`}</Text>
            </TouchableOpacity>
            <Text style={styles.hint}>Première connexion : après vérification du mot de passe, EduConnect vous demandera automatiquement votre code OTP.</Text>
          </View>
          <View style={styles.security}><ShieldCheck size={16} color={Colors.gray400} /><Text style={styles.securityText}>Parcours sécurisé Parent · Élève · Personnel</Text></View>
        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing['2xl'], paddingVertical: Spacing['2xl'] },
  logoContainer: { alignItems: 'center', marginBottom: Spacing['2xl'] },
  logo: { width: 68, height: 68, borderRadius: 34, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  logoText: { color: Colors.white, fontSize: FontSize['2xl'], fontWeight: '800' },
  appName: { marginTop: Spacing.md, fontSize: FontSize['2xl'], fontWeight: '700', color: Colors.primary },
  subtitle: { marginTop: 2, color: Colors.gray500, fontSize: FontSize.sm },
  card: { backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: Spacing['2xl'] },
  title: { fontSize: FontSize['2xl'], fontWeight: '700', color: Colors.gray900 },
  description: { marginTop: Spacing.xs, marginBottom: Spacing.lg, color: Colors.gray500, fontSize: FontSize.sm },
  roleRow: { flexDirection: 'row', gap: Spacing.xs, marginBottom: Spacing.lg },
  roleButton: { flex: 1, minHeight: 44, borderWidth: 1, borderColor: Colors.gray200, borderRadius: BorderRadius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs },
  roleActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  roleText: { color: Colors.gray600, fontSize: FontSize.xs, fontWeight: '600' },
  roleTextActive: { color: Colors.white },
  error: { backgroundColor: '#FEF2F2', borderLeftWidth: 3, borderLeftColor: Colors.danger, padding: Spacing.md, borderRadius: BorderRadius.sm, marginBottom: Spacing.md },
  errorText: { color: Colors.danger, fontSize: FontSize.sm },
  label: { color: Colors.gray700, fontSize: FontSize.sm, fontWeight: '600', marginBottom: Spacing.xs, marginTop: Spacing.sm },
  input: { borderWidth: 1, borderColor: Colors.gray200, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, color: Colors.gray900, fontSize: FontSize.md, backgroundColor: Colors.white },
  button: { marginTop: Spacing.lg, minHeight: 52, borderRadius: BorderRadius.md, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: Spacing.sm },
  disabled: { opacity: 0.6 },
  buttonText: { color: Colors.white, fontSize: FontSize.md, fontWeight: '700' },
  hint: { marginTop: Spacing.lg, textAlign: 'center', color: Colors.gray400, fontSize: FontSize.xs, lineHeight: 18 },
  security: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, marginTop: Spacing.lg },
  securityText: { color: Colors.gray400, fontSize: FontSize.xs },
});
