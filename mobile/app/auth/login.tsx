import React, { useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { ShieldCheck } from 'lucide-react-native';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '@/theme';
import authService from '@/services/auth.service';
import type { OtpRequest } from '@/types';

type LoginRole = 'parent' | 'student' | 'staff';

export default function LoginScreen() {
  const [role, setRole] = useState<LoginRole>('parent');
  const [phone, setPhone] = useState('');
  const [matricule, setMatricule] = useState('');
  const [childMatricule, setChildMatricule] = useState('');
  const [requiresChildMatricule, setRequiresChildMatricule] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const phoneRef = useRef<TextInput>(null);
  const matriculeRef = useRef<TextInput>(null);
  const childRef = useRef<TextInput>(null);

  const establishmentName = Constants.expoConfig?.extra?.establishmentSlug ?? 'Votre établissement';

  const handleSubmit = async () => {
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
      setError('Plusieurs comptes utilisent ce numéro. Saisissez le matricule scolaire de votre enfant.');
      return;
    }

    const request: OtpRequest = {
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
          ...(cleanMatricule ? { matricule: cleanMatricule } : {}),
          ...(cleanChild ? { childMatricule: cleanChild } : {}),
        },
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue. Veuillez réessayer.');
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
            <Text style={styles.cardSubtitle}>Choisissez votre type de compte pour recevoir un code de vérification.</Text>

            <View style={styles.roleRow}>
              {(['parent', 'student', 'staff'] as LoginRole[]).map((item) => (
                <TouchableOpacity key={item} style={[styles.roleButton, role === item && styles.roleButtonActive]} onPress={() => { setRole(item); setError(''); setRequiresChildMatricule(false); }}>
                  <Text style={[styles.roleText, role === item && styles.roleTextActive]}>
                    {item === 'parent' ? 'Parent' : item === 'student' ? 'Élève' : 'Personnel'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

            {role !== 'parent' ? (
              <View style={styles.field}>
                <Text style={styles.label}>Matricule de compte</Text>
                <TextInput ref={matriculeRef} style={styles.input} value={matricule} onChangeText={setMatricule} placeholder="Ex : STU-2026-001" autoCapitalize="characters" autoCorrect={false} returnKeyType="next" onSubmitEditing={() => phoneRef.current?.focus()} />
              </View>
            ) : (
              <Text style={styles.info}>Un parent se connecte avec le numéro de téléphone enregistré par l’établissement. Aucun matricule de compte parent n’est nécessaire.</Text>
            )}

            <View style={styles.field}>
              <Text style={styles.label}>Numéro de téléphone</Text>
              <View style={styles.phoneRow}>
                <View style={styles.prefixBox}><Text style={styles.prefixText}>+225</Text></View>
                <TextInput ref={phoneRef} style={[styles.input, styles.phoneInput]} value={phone} onChangeText={setPhone} placeholder="07 XX XX XX XX" keyboardType="phone-pad" returnKeyType="done" onSubmitEditing={handleSubmit} />
              </View>
            </View>

            {role === 'parent' && requiresChildMatricule ? (
              <View style={styles.field}>
                <Text style={styles.label}>Matricule scolaire de votre enfant</Text>
                <TextInput ref={childRef} style={styles.input} value={childMatricule} onChangeText={setChildMatricule} placeholder="Ex : ELEVE-2026-001" autoCapitalize="characters" autoCorrect={false} returnKeyType="done" onSubmitEditing={handleSubmit} />
              </View>
            ) : null}

            <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleSubmit} disabled={loading} activeOpacity={0.8}>
              <Text style={styles.buttonText}>{loading ? 'Vérification du compte...' : 'Recevoir le code'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.securityNote}><ShieldCheck size={16} color={Colors.gray400} /><Text style={styles.securityText}>Le code est envoyé uniquement au téléphone enregistré.</Text></View>
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
  roleButton: { flex: 1, paddingVertical: Spacing.sm, borderWidth: 1, borderColor: Colors.gray200, borderRadius: BorderRadius.md, alignItems: 'center' },
  roleButtonActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  roleText: { fontSize: FontSize.sm, color: Colors.gray600, fontWeight: '500' },
  roleTextActive: { color: Colors.white },
  info: { fontSize: FontSize.sm, color: Colors.gray600, backgroundColor: Colors.gray100, padding: Spacing.md, borderRadius: BorderRadius.md, marginBottom: Spacing.lg, lineHeight: 20 },
  errorBox: { backgroundColor: '#FEF2F2', borderLeftWidth: 3, borderLeftColor: Colors.danger, padding: Spacing.md, borderRadius: BorderRadius.sm, marginBottom: Spacing.lg },
  errorText: { color: Colors.danger, fontSize: FontSize.sm },
  field: { marginBottom: Spacing.lg },
  label: { fontSize: FontSize.sm, fontWeight: '500', color: Colors.gray700, marginBottom: Spacing.xs },
  input: { borderWidth: 1, borderColor: Colors.gray200, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, fontSize: FontSize.md, color: Colors.gray900, backgroundColor: Colors.white },
  phoneRow: { flexDirection: 'row', alignItems: 'center' },
  prefixBox: { backgroundColor: Colors.gray100, borderWidth: 1, borderColor: Colors.gray200, borderRightWidth: 0, borderRadius: BorderRadius.md, borderTopRightRadius: 0, borderBottomRightRadius: 0, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, justifyContent: 'center' },
  prefixText: { fontSize: FontSize.md, fontWeight: '500', color: Colors.gray700 },
  phoneInput: { borderTopLeftRadius: 0, borderBottomLeftRadius: 0, flex: 1 },
  button: { backgroundColor: Colors.primary, borderRadius: BorderRadius.md, paddingVertical: Spacing.lg, alignItems: 'center', marginTop: Spacing.sm },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: Colors.white, fontSize: FontSize.md, fontWeight: '600' },
  securityNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, marginTop: Spacing.xl },
  securityText: { fontSize: FontSize.xs, color: Colors.gray400 },
});
