import React, { useEffect, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ArrowLeft, RefreshCw } from 'lucide-react-native';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '@/theme';
import authService from '@/services/auth.service';
import type { MobileRole, OtpVerifyRequest } from '@/types';
import type { AuthStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Otp'>;
const OTP_LENGTH = 6;
const RESEND_DELAY = 60;
const BACKEND_ROLES: Record<MobileRole, OtpVerifyRequest['role']> = { parent: 'PARENT', student: 'STUDENT', staff: 'STAFF' };

export default function OtpScreen({ navigation, route }: Props) {
  const { phone, role, matricule, childMatricule } = route.params;
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(RESEND_DELAY);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const maskedPhone = phone.replace(/(.{2})(.*)(.{2})/, (_, start, middle, end) => `${start}${'•'.repeat(middle.length)}${end}`);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (resendTimer <= 0) { setCanResend(true); return; }
    const timer = setInterval(() => setResendTimer((value) => value - 1), 1000);
    return () => clearInterval(timer);
  }, [resendTimer]);

  const buildRequest = (code: string): OtpVerifyRequest => ({
    role: BACKEND_ROLES[role],
    phone,
    code,
    ...(matricule ? { matricule } : {}),
    ...(childMatricule ? { childMatricule } : {}),
  });

  const handleVerify = async (code = otp.join('')) => {
    if (code.length !== OTP_LENGTH) { setError('Veuillez saisir le code complet.'); return; }
    Keyboard.dismiss();
    setLoading(true);
    setError('');
    try {
      await authService.verifyOtp(buildRequest(code));
      navigation.getParent()?.reset({ index: 0, routes: [{ name: 'App' }] });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Code invalide. Veuillez réessayer.');
      setOtp(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    setError('');
    if (digit && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
    if (next.every(Boolean)) void handleVerify(next.join(''));
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      const next = [...otp];
      next[index - 1] = '';
      setOtp(next);
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    try {
      await authService.requestOtp({ role: BACKEND_ROLES[role], phone, ...(matricule ? { matricule } : {}), ...(childMatricule ? { childMatricule } : {}) });
      setResendTimer(RESEND_DELAY);
      setCanResend(false);
      setOtp(Array(OTP_LENGTH).fill(''));
      setError('');
      inputRefs.current[0]?.focus();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors du renvoi du code.');
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.inner}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={Colors.primary} />
        </TouchableOpacity>
        <View style={[styles.card, Shadows.md]}>
          <Text style={styles.title}>Vérification — {role === 'parent' ? 'Parent' : role === 'student' ? 'Élève' : 'Personnel'}</Text>
          <Text style={styles.subtitle}>Un code à 6 chiffres a été envoyé au{ '\n' }<Text style={styles.phoneHighlight}>+225 {maskedPhone}</Text></Text>
          <View style={styles.otpRow}>
            {otp.map((digit, index) => (
              <TextInput key={index} ref={(ref) => { inputRefs.current[index] = ref; }} style={[styles.otpInput, digit && styles.otpInputFilled]} value={digit} onChangeText={(value) => handleChange(index, value)} onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)} keyboardType="number-pad" maxLength={1} selectTextOnFocus />
            ))}
          </View>
          {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}
          <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={() => void handleVerify()} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? 'Vérification...' : 'Vérifier'}</Text>
          </TouchableOpacity>
          <View style={styles.resendContainer}>
            {canResend ? <TouchableOpacity onPress={() => void handleResend()}><View style={styles.resendRow}><RefreshCw size={14} color={Colors.primary} /><Text style={styles.resendLink}>Renvoyer le code</Text></View></TouchableOpacity> : <Text style={styles.resendTimer}>Renvoyer dans {resendTimer}s</Text>}
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { flex: 1, paddingHorizontal: Spacing['2xl'], paddingVertical: Spacing['2xl'], justifyContent: 'center' },
  backButton: { alignSelf: 'flex-start', marginBottom: Spacing.lg, padding: Spacing.sm },
  card: { backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: Spacing['2xl'] },
  title: { fontSize: FontSize['3xl'], fontWeight: '700', color: Colors.gray900 },
  subtitle: { fontSize: FontSize.md, color: Colors.gray500, marginTop: Spacing.sm, marginBottom: Spacing['3xl'], lineHeight: 22 },
  phoneHighlight: { fontWeight: '600', color: Colors.gray700 },
  otpRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xl },
  otpInput: { width: 42, height: 54, borderWidth: 2, borderColor: Colors.gray200, borderRadius: BorderRadius.md, textAlign: 'center', fontSize: FontSize.xl, fontWeight: '600', color: Colors.gray900, backgroundColor: Colors.white },
  otpInputFilled: { borderColor: Colors.primary, backgroundColor: '#EFF6FF' },
  errorBox: { backgroundColor: '#FEF2F2', borderLeftWidth: 3, borderLeftColor: Colors.danger, padding: Spacing.md, borderRadius: BorderRadius.sm, marginBottom: Spacing.lg },
  errorText: { color: Colors.danger, fontSize: FontSize.sm },
  button: { backgroundColor: Colors.primary, borderRadius: BorderRadius.md, paddingVertical: Spacing.lg, alignItems: 'center' },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: Colors.white, fontSize: FontSize.md, fontWeight: '600' },
  resendContainer: { alignItems: 'center', marginTop: Spacing.xl },
  resendRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  resendLink: { color: Colors.primary, fontSize: FontSize.md, fontWeight: '500' },
  resendTimer: { color: Colors.gray400, fontSize: FontSize.sm },
});
