import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { COLORS } from '../../utils/constants';

interface LoginScreenProps {
  onSwitchToSignup: () => void;
}

type AuthMode = 'password' | 'otp';

export function LoginScreen({ onSwitchToSignup }: LoginScreenProps) {
  const { signIn, requestSmsOtp, verifySmsOtp, signInWithGoogle, isLoading, error, clearError } = useAuth();
  const [mode, setMode] = useState<AuthMode>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const displayError = localError || error;

  const modeTitle = useMemo(() => (mode === 'password' ? 'Email Login' : 'SMS OTP Login'), [mode]);

  const resetFeedback = () => {
    setLocalError(null);
    setNotice(null);
    clearError();
  };

  const onPasswordLogin = async () => {
    resetFeedback();
    if (!email.trim()) return setLocalError('Email is required');
    if (!password.trim()) return setLocalError('Password is required');

    try {
      await signIn(email.trim(), password);
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : 'Unable to sign in');
    }
  };

  const onRequestOtp = async () => {
    resetFeedback();
    if (!phone.trim()) return setLocalError('Phone number is required');
    setActionLoading(true);
    try {
      await requestSmsOtp(phone.trim());
      setOtpSent(true);
      setNotice('OTP sent. Enter the code from SMS.');
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : 'Unable to send OTP');
    } finally {
      setActionLoading(false);
    }
  };

  const onVerifyOtp = async () => {
    resetFeedback();
    if (!phone.trim()) return setLocalError('Phone number is required');
    if (!otp.trim()) return setLocalError('OTP is required');
    try {
      await verifySmsOtp(phone.trim(), otp.trim());
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : 'Unable to verify OTP');
    }
  };

  const onGoogle = async () => {
    resetFeedback();
    setActionLoading(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : 'Google sign-in failed');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.brand}>FinMax</Text>
            <Text style={styles.subtitle}>Secure fintech mobile experience</Text>
          </View>

          <View style={styles.modeRow}>
            <TouchableOpacity
              style={[styles.modeButton, mode === 'password' && styles.modeButtonActive]}
              onPress={() => {
                setMode('password');
                setOtpSent(false);
                setOtp('');
                resetFeedback();
              }}
            >
              <Text style={[styles.modeText, mode === 'password' && styles.modeTextActive]}>Email</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeButton, mode === 'otp' && styles.modeButtonActive]}
              onPress={() => {
                setMode('otp');
                setPassword('');
                resetFeedback();
              }}
            >
              <Text style={[styles.modeText, mode === 'otp' && styles.modeTextActive]}>SMS OTP</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{modeTitle}</Text>

            {displayError ? (
              <View style={styles.errorBox}><Text style={styles.errorText}>{displayError}</Text></View>
            ) : null}
            {notice ? (
              <View style={styles.noticeBox}><Text style={styles.noticeText}>{notice}</Text></View>
            ) : null}

            {mode === 'password' ? (
              <>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="you@example.com"
                  placeholderTextColor="#7A7A7A"
                />

                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  placeholder="••••••••"
                  placeholderTextColor="#7A7A7A"
                />

                <TouchableOpacity style={styles.primaryButton} onPress={onPasswordLogin} disabled={isLoading}>
                  {isLoading ? <ActivityIndicator color={COLORS.background} /> : <Text style={styles.primaryButtonText}>Sign In</Text>}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.label}>Phone (E.164)</Text>
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  placeholder="+919876543210"
                  placeholderTextColor="#7A7A7A"
                />

                {otpSent ? (
                  <>
                    <Text style={styles.label}>OTP</Text>
                    <TextInput
                      style={styles.input}
                      value={otp}
                      onChangeText={setOtp}
                      keyboardType="number-pad"
                      placeholder="123456"
                      placeholderTextColor="#7A7A7A"
                    />
                    <TouchableOpacity style={styles.primaryButton} onPress={onVerifyOtp} disabled={isLoading}>
                      {isLoading ? <ActivityIndicator color={COLORS.background} /> : <Text style={styles.primaryButtonText}>Verify OTP</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.linkButton} onPress={onRequestOtp} disabled={actionLoading}>
                      {actionLoading ? <ActivityIndicator color={COLORS.primary} /> : <Text style={styles.linkButtonText}>Resend OTP</Text>}
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity style={styles.primaryButton} onPress={onRequestOtp} disabled={actionLoading}>
                    {actionLoading ? <ActivityIndicator color={COLORS.background} /> : <Text style={styles.primaryButtonText}>Send OTP</Text>}
                  </TouchableOpacity>
                )}
              </>
            )}

            <View style={styles.divider} />

            <TouchableOpacity style={styles.googleButton} onPress={onGoogle} disabled={actionLoading || isLoading}>
              {(actionLoading && !isLoading) ? <ActivityIndicator color="#fff" /> : <Text style={styles.googleButtonText}>Continue with Google</Text>}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>New to FinMax?</Text>
            <TouchableOpacity onPress={onSwitchToSignup}>
              <Text style={styles.footerLink}>Create account</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  header: { marginBottom: 24, alignItems: 'center' },
  brand: { color: COLORS.text, fontSize: 34, fontWeight: '700' },
  subtitle: { color: COLORS.textSecondary, marginTop: 6 },
  modeRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 4,
    marginBottom: 14,
  },
  modeButton: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  modeButtonActive: { backgroundColor: 'rgba(0,242,234,0.16)' },
  modeText: { color: COLORS.textSecondary, fontWeight: '600' },
  modeTextActive: { color: COLORS.primary },
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 16,
  },
  sectionTitle: { color: COLORS.text, fontSize: 18, fontWeight: '600', marginBottom: 8 },
  label: { color: COLORS.textSecondary, fontSize: 12, marginBottom: 6, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: COLORS.text,
  },
  primaryButton: {
    marginTop: 14,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: { color: COLORS.background, fontWeight: '700' },
  linkButton: { marginTop: 10, alignItems: 'center', paddingVertical: 8 },
  linkButtonText: { color: COLORS.primary, fontWeight: '600' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 16 },
  googleButton: {
    borderWidth: 1,
    borderColor: '#2f4f90',
    backgroundColor: '#1f2f56',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 12,
  },
  googleButtonText: { color: '#fff', fontWeight: '600' },
  errorBox: { backgroundColor: 'rgba(255,107,107,0.13)', borderRadius: 8, padding: 10, marginTop: 8 },
  errorText: { color: COLORS.error, fontSize: 12 },
  noticeBox: { backgroundColor: 'rgba(16,185,129,0.15)', borderRadius: 8, padding: 10, marginTop: 8 },
  noticeText: { color: COLORS.success, fontSize: 12 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 16, gap: 6 },
  footerText: { color: COLORS.textSecondary },
  footerLink: { color: COLORS.primary, fontWeight: '600' },
});
