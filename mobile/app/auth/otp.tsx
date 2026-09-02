import React, { useState, useRef, useEffect } from 'react';
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
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, RefreshCw } from 'lucide-react-native';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '@/theme';
import authService from '@/services/auth.service';

const OTP_LENGTH = 6;
const RESEND_DELAY = 60;

export default function OtpScreen() {
  const { matricule, phone } = useLocalSearchParams<{ matricule: string; phone: string }>();
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(RESEND_DELAY);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const maskedPhone = phone
    ? phone.replace(/(.{2})(.*)(.{2})/, (_, start, middle, end) => `${start}${'•'.repeat(middle.length)}${end}`)
    : '••••••••';

  useEffect(() => {
    if (resendTimer <= 0) {
      setCanResend(true);
      return;
    }
    const interval = setInterval(() => {
      setResendTimer((t) => t - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  useEffect(() => {
    // Focus le premier champ
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) value = value[value.length - 1];
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError('');

    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit si tout est rempli
    if (newOtp.every((d) => d !== '')) {
      handleVerify(newOtp.join(''));
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      const newOtp = [...otp];
      newOtp[index - 1] = '';
      setOtp(newOtp);
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (code?: string) => {
    const otpCode = code ?? otp.join('');
    if (otpCode.length !== OTP_LENGTH) {
      setError('Veuillez saisir le code complet.');
      return;
    }

    Keyboard.dismiss();
    setLoading(true);
    setError('');

    try {
      await authService.verifyOtp(matricule ?? '', otpCode);
      router.replace('/(tabs)');
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Code invalide. Veuillez réessayer.';
      setError(message);
      setOtp(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    try {
      await authService.requestOtp(matricule ?? '', phone ?? '');
      setResendTimer(RESEND_DELAY);
      setCanResend(false);
      setOtp(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Erreur lors du renvoi du code.';
      setError(message);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.inner}>
          {/* En-tête */}
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color={Colors.primary} />
          </TouchableOpacity>

          <Text style={styles.title}>Vérification</Text>
          <Text style={styles.subtitle}>
            Un code à 6 chiffres a été envoyé au{'\n'}
            <Text style={styles.phoneHighlight}>+225 {maskedPhone}</Text>
          </Text>

          {/* Champs OTP */}
          <View style={styles.otpRow}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => { inputRefs.current[index] = ref; }}
                style={[styles.otpInput, digit && styles.otpInputFilled]}
                value={digit}
                onChangeText={(value) => handleChange(index, value)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
                autoFocus={index === 0}
              />
            ))}
          </View>

          {/* Erreur */}
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Bouton vérifier */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={() => handleVerify()}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Vérification...' : 'Vérifier'}
            </Text>
          </TouchableOpacity>

          {/* Renvoyer le code */}
          <View style={styles.resendContainer}>
            {canResend ? (
              <TouchableOpacity onPress={handleResend}>
                <View style={styles.resendRow}>
                  <RefreshCw size={14} color={Colors.primary} />
                  <Text style={styles.resendLink}>Renvoyer le code</Text>
                </View>
              </TouchableOpacity>
            ) : (
              <Text style={styles.resendTimer}>
                Renvoyer dans {resendTimer}s
              </Text>
            )}
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
    paddingHorizontal: Spacing['2xl'],
    paddingTop: Spacing['2xl'],
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: Spacing['2xl'],
    padding: Spacing.sm,
  },
  title: {
    fontSize: FontSize['3xl'],
    fontWeight: '700',
    color: Colors.gray900,
    fontFamily: 'system-ui',
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.gray500,
    fontFamily: 'system-ui',
    marginTop: Spacing.sm,
    marginBottom: Spacing['3xl'],
    lineHeight: 22,
  },
  phoneHighlight: {
    fontWeight: '600',
    color: Colors.gray700,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderWidth: 2,
    borderColor: Colors.gray200,
    borderRadius: BorderRadius.md,
    textAlign: 'center',
    fontSize: FontSize.xl,
    fontWeight: '600',
    color: Colors.gray900,
    fontFamily: 'system-ui',
    backgroundColor: Colors.white,
  },
  otpInputFilled: {
    borderColor: Colors.primary,
    backgroundColor: '#EFF6FF',
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
  resendContainer: {
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  resendLink: {
    color: Colors.primary,
    fontSize: FontSize.md,
    fontWeight: '500',
    fontFamily: 'system-ui',
  },
  resendTimer: {
    color: Colors.gray400,
    fontSize: FontSize.sm,
    fontFamily: 'system-ui',
  },
});
