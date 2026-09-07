import React, { useEffect, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { ArrowLeft, RefreshCw } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Colors, Spacing, FontSize, BorderRadius } from '@/theme';
import authService from '@/services/auth.service';
import type { AuthStackParamList } from '@/navigation/types';

const BACKEND_ROLES = { parent: 'PARENT', student: 'STUDENT', staff: 'STAFF' } as const;
type Nav = NativeStackNavigationProp<AuthStackParamList, 'Otp'>;
type OtpRoute = RouteProp<AuthStackParamList, 'Otp'>;

export default function OtpScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<OtpRoute>();
  const { phone, role, matricule, childMatricule } = route.params;
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(60);
  const refs = useRef<Array<TextInput | null>>([]);
  const masked = phone ? phone.replace(/(.{2})(.*)(.{2})/, (_, a, b, c) => `${a}${'•'.repeat(b.length)}${c}`) : '••••••••';

  useEffect(() => {
    const interval = setInterval(() => setTimer((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => { refs.current[0]?.focus(); }, []);

  const verify = async (code: string) => {
    if (code.length !== 6) return setError('Veuillez saisir le code complet.');
    setLoading(true); setError(''); Keyboard.dismiss();
    try {
      await authService.verifyOtp({ role: BACKEND_ROLES[role], phone, code, ...(matricule ? { matricule } : {}), ...(childMatricule ? { childMatricule } : {}) });
      navigation.getParent()?.reset({ index: 0, routes: [{ name: 'App' }] });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Code invalide. Veuillez réessayer.');
      setOtp(['', '', '', '', '', '']); refs.current[0]?.focus();
    } finally { setLoading(false); }
  };

  const change = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...otp]; next[index] = digit; setOtp(next); setError('');
    if (digit && index < 5) refs.current[index + 1]?.focus();
    if (next.every(Boolean)) void verify(next.join(''));
  };

  const resend = async () => {
    if (timer > 0) return;
    try {
      await authService.requestOtp({ role: BACKEND_ROLES[role], phone, ...(matricule ? { matricule } : {}), ...(childMatricule ? { childMatricule } : {}) });
      setTimer(60); setOtp(['', '', '', '', '', '']); setError(''); refs.current[0]?.focus();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Impossible de renvoyer le code.'); }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.inner}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}><ArrowLeft size={24} color={Colors.primary} /></TouchableOpacity>
          <View style={styles.card}>
            <Text style={styles.title}>Vérification OTP</Text>
            <Text style={styles.subtitle}>Un code à 6 chiffres a été envoyé au{ '\n' }<Text style={styles.phone}>+225 {masked}</Text></Text>
            <View style={styles.row}>{otp.map((digit, index) => <TextInput key={index} ref={(ref) => { refs.current[index] = ref; }} style={[styles.input, digit && styles.filled]} value={digit} onChangeText={(v) => change(index, v)} onKeyPress={({ nativeEvent }) => { if (nativeEvent.key === 'Backspace' && !otp[index] && index > 0) { const next = [...otp]; next[index - 1] = ''; setOtp(next); refs.current[index - 1]?.focus(); } }} keyboardType="number-pad" maxLength={1} selectTextOnFocus />)}</View>
            {error ? <View style={styles.error}><Text style={styles.errorText}>{error}</Text></View> : null}
            <TouchableOpacity style={[styles.button, loading && styles.disabled]} disabled={loading} onPress={() => void verify(otp.join(''))}><Text style={styles.buttonText}>{loading ? 'Vérification...' : 'Vérifier le code'}</Text></TouchableOpacity>
            <TouchableOpacity style={styles.resend} disabled={timer > 0} onPress={() => void resend()}><RefreshCw size={15} color={timer > 0 ? Colors.gray400 : Colors.primary} /><Text style={[styles.resendText, timer > 0 && styles.resendDisabled]}>{timer > 0 ? `Renvoyer dans ${timer}s` : 'Renvoyer le code'}</Text></TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: Colors.background }, inner: { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing['2xl'] }, back: { alignSelf: 'flex-start', padding: Spacing.sm, marginBottom: Spacing.md }, card: { backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: Spacing['2xl'] }, title: { fontSize: FontSize['2xl'], fontWeight: '700', color: Colors.gray900 }, subtitle: { color: Colors.gray500, fontSize: FontSize.md, lineHeight: 22, marginTop: Spacing.sm, marginBottom: Spacing['2xl'] }, phone: { color: Colors.gray800, fontWeight: '700' }, row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xl }, input: { width: 42, height: 54, borderWidth: 2, borderColor: Colors.gray200, borderRadius: BorderRadius.md, textAlign: 'center', fontSize: FontSize.xl, color: Colors.gray900 }, filled: { borderColor: Colors.primary }, error: { backgroundColor: '#FEF2F2', padding: Spacing.md, borderLeftWidth: 3, borderLeftColor: Colors.danger, marginBottom: Spacing.md }, errorText: { color: Colors.danger, fontSize: FontSize.sm }, button: { minHeight: 52, backgroundColor: Colors.primary, borderRadius: BorderRadius.md, justifyContent: 'center', alignItems: 'center' }, disabled: { opacity: 0.6 }, buttonText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.md }, resend: { marginTop: Spacing.xl, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: Spacing.xs }, resendText: { color: Colors.primary, fontWeight: '600', fontSize: FontSize.sm }, resendDisabled: { color: Colors.gray400 }, });
