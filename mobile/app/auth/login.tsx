import React, { useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { ShieldCheck, KeyRound } from 'lucide-react-native';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '@/theme';
import authService from '@/services/auth.service';
import type { OtpRequest, MobileRole } from '@/types';

type LoginRole = MobileRole;
type LoginMode = 'password' | 'first';

const ROLE_LABELS: Record<LoginRole, string> = { parent: 'Parent', student: 'Élève', staff: 'Personnel' };
const BACKEND_ROLES: Record<LoginRole, OtpRequest['role']> = { parent: 'PARENT', student: 'STUDENT', staff: 'STAFF' };

export default function LoginScreen() {
  const [role, setRole] = useState<LoginRole>('parent');
  const [mode, setMode] = useState<LoginMode>('password');
  const [identifier, setIdentifier] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [matricule, setMatricule] = useState('');
  const [childMatricule, setChildMatricule] = useState('');
  const [requiresChildMatricule, setRequiresChildMatricule] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const identifierRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const matriculeRef = useRef<TextInput>(null);
  const childRef = useRef<TextInput>(null);

  const establishmentName = Constants.expoConfig?.extra?.establishmentSlug ?? 'Votre établissement';

  const handleRoleChange = (nextRole: LoginRole) => {
    setRole(nextRole);
    setError('');
    setRequiresChildMatricule(false);
    setChildMatricule('');
    setIdentifier('');
    setPassword('');
    setPhone('');
    setMatricule('');
  };

  const switchMode = (nextMode: LoginMode) => {
    setMode(nextMode);
    setError('');
    setRequiresChildMatricule(false);
  };

  const handlePasswordLogin = async () => {
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
      await authService.loginWithPassword(role, cleanIdentifier, password);
      router.replace('/(tabs)');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Identifiant ou mot de passe incorrect.');
    } finally {
      setLoading(false);
    }
  };

  const handleFirstConnection = async () => {
    Keyboard.dismiss();
    setError('');
    const cleanPhone = phone.trim();
    const cleanMatricule = matricule.trim();
    const cleanChild = childMatricule.trim();

    if (!cleanPhone || cleanPhone.replace(/\D/g, '').length < 9) {
      setError('Veuillez saisir un numéro de téléphone valide.');
      return;
    }
    if (role !== 'parent' && !cleanMatricule) {
      setError('Veuillez saisir votre matricule de compte.');
      return;
    }
    if (role === 'parent' && requiresChildMatricule && !cleanChild) {
      setError('Saisissez le matricule scolaire de votre enfant.');
      return;
    }

    const request: OtpRequest = {
      role: BACKEND_ROLES[role],
      phone: cleanPhone,
      ...(role !== 'parent' ? { matricule: cleanMatricule } : {}),
      ...(role === 'parent' && cleanChild ? { childMatricule: cleanChild } : {}),
    };

    setLoading(true);
    try {
      const response = await authService.requestOtp(request);
      if (response.data.requiresChildMatricule) {
        setRequiresChildMatricule(true);
        setError('Ce numéro est associé à plusieurs comptes parents. Identifiez votre enfant pour continuer.');
        setTimeout(() => childRef.current?.focus(), 50);
        return;
      }
      router.push({
        pathname: '/auth/otp',
        params: {
          phone: cleanPhone,
          role,
          firstConnection: 'true',
          ...(cleanMatricule ? { matricule: cleanMatricule } : {}),
          ...(cleanChild ? { childMatricule: cleanChild } : {}),
        },
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de demander le code OTP.');
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
            <Text style={styles.cardTitle}>{mode === 'password' ? 'Connexion' : 'Première connexion'}</Text>
            <Text style={styles.cardSubtitle}>
              {mode === 'password'
                ? 'Connectez-vous avec votre identifiant et votre mot de passe.'
                : 'Activez votre compte une seule fois avec le code envoyé sur votre téléphone.'}
            </Text>

            <View style={styles.roleRow}>
              {(['parent', 'student', 'staff'] as LoginRole[]).map((item) => (
                <TouchableOpacity key={item} style={[styles.roleButton, role === item && styles.roleButtonActive]} onPress={() => handleRoleChange(item)}>
                  <Text style={[styles.roleText, role === item && styles.roleTextActive]}>{ROLE_LABELS[item]}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modeRow}>
              <TouchableOpacity style={[styles.modeButton, mode === 'password' && styles.modeButtonActive]} onPress={() => switchMode('password')}>
                <KeyRound size={16} color={mode === 'password' ? Colors.white : Colors.primary} />
                <Text style={[styles.modeText, mode === 'password' && styles.modeTextActive]}>Connexion</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modeButton, mode === 'first' && styles.modeButtonActive]} onPress={() => switchMode('first')}>
                <Text style={[styles.modeText, mode === 'first' && styles.modeTextActive]}>Première connexion</Text>
              </TouchableOpacity>
            </View>

            {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

            {mode === 'password' ? (
              <>
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
                  <TextInput ref={passwordRef} style={styles.input} value={password} onChangeText={setPassword} placeholder="Votre mot de passe" secureTextEntry returnKeyType="done" onSubmitEditing={handlePasswordLogin} />
                </View>
                <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handlePasswordLogin} disabled={loading} activeOpacity={0.8}>
                  <Text style={styles.buttonText}>{loading ? 'Connexion...' : `Se connecter — ${ROLE_LABELS[role]}`}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                {role !== 'parent' ? (
                  <View style={styles.field}>
                    <Text style={styles.label}>Matricule de compte</Text>
                    <TextInput ref={matriculeRef} style={styles.input} value={matricule} onChangeText={setMatricule} placeholder={role === 'student' ? 'ELE-2026-001' : 'PER-2026-001'} autoCapitalize="characters" autoCorrect={false} returnKeyType="next" onSubmitEditing={() => phoneRef.current?.focus()} />
                  </View>
                ) : (
                  <Text style={styles.info}>Parent : utilisez le numéro de téléphone enregistré par l’établissement. Si plusieurs comptes utilisent ce numéro, le matricule de l’enfant sera demandé.</Text>
                )}
                <View style={styles.field}>
                  <Text style={styles.label}>Numéro de téléphone</Text>
                  <TextInput ref={phoneRef} style={styles.input} value={phone} onChangeText={setPhone} placeholder="+225 07 XX XX XX XX" keyboardType="phone-pad" returnKeyType="done" onSubmitEditing={handleFirstConnection} />
                </View>
                {role === 'parent' && requiresChildMatricule ? (
                  <View style={styles.field}>
                    <Text style={styles.label}>Matricule scolaire de votre enfant</Text>
                    <TextInput ref={childRef} style={styles.input} value={childMatricule} onChangeText={setChildMatricule} placeholder="SCO-TEST-001" autoCapitalize="characters" autoCorrect={false} returnKeyType="done" onSubmitEditing={handleFirstConnection} />
                  </View>
                ) : null}
                <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleFirstConnection} disabled={loading} activeOpacity={0.8}>
                  <Text style={styles.buttonText}>{loading ? 'Vérification...' : 'Recevoir le code OTP'}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          <View style={styles.securityNote}>
            <ShieldCheck size={16} color={Colors.gray400} />
            <Text style={styles.securityText}>{mode === 'password' ? 'Le code OTP est demandé uniquement lors de la première connexion.' : 'Le code OTP sert à activer le compte lors de la première connexion.'}</Text>
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
  roleRow: { flexDirection: 'row', gap: Spacing.xs, marginBottom: Spacing.md },
  roleButton: { flex: 1, paddingVertical: Spacing.sm, borderWidth: 1, borderColor: Colors.gray200, borderRadius: BorderRadius.md, alignItems: 'center' },
  roleButtonActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  roleText: { fontSize: FontSize.sm, color: Colors.gray600, fontWeight: '500' },
  roleTextActive: { color: Colors.white },
  modeRow: { flexDirection: 'row', gap: Spacing.xs, marginBottom: Spacing.lg },
  modeButton: { flex: 1, minHeight: 42, paddingHorizontal: Spacing.sm, borderWidth: 1, borderColor: Colors.gray200, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: Spacing.xs },
  modeButtonActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  modeText: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: '600', textAlign: 'center' },
  modeTextActive: { color: Colors.white },
  info: { fontSize: FontSize.sm, color: Colors.gray600, backgroundColor: Colors.gray100, padding: Spacing.md, borderRadius: BorderRadius.md, marginBottom: Spacing.lg, lineHeight: 20 },
  errorBox: { backgroundColor: '#FEF2F2', borderLeftWidth: 3, borderLeftColor: Colors.danger, padding: Spacing.md, borderRadius: BorderRadius.sm, marginBottom: Spacing.lg },
  errorText: { color: Colors.danger, fontSize: FontSize.sm },
  field: { marginBottom: Spacing.lg },
  label: { fontSize: FontSize.sm, fontWeight: '500', color: Colors.gray700, marginBottom: Spacing.xs },
  input: { borderWidth: 1, borderColor: Colors.gray200, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, fontSize: FontSize.md, color: Colors.gray900, backgroundColor: Colors.white },
  button: { backgroundColor: Colors.primary, borderRadius: BorderRadius.md, paddingVertical: Spacing.lg, alignItems: 'center', marginTop: Spacing.sm },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: Colors.white, fontSize: FontSize.md, fontWeight: '600' },
  securityNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, marginTop: Spacing.xl },
  securityText: { fontSize: FontSize.xs, color: Colors.gray400, textAlign: 'center', flex: 1 },
});
