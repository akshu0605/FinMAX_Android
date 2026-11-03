import React, { useState } from 'react';
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
import { COLORS, isValidEmail } from '../../utils/constants';

interface SignupScreenProps {
  onSwitchToLogin: () => void;
}

export function SignupScreen({ onSwitchToLogin }: SignupScreenProps) {
  const { signUp, signInWithGoogle, isLoading, error, clearError } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  const displayError = localError || error;

  const resetError = () => {
    setLocalError(null);
    clearError();
  };

  const onSubmit = async () => {
    resetError();
    if (name.trim().length < 2) return setLocalError('Name must be at least 2 characters');
    if (!isValidEmail(email.trim())) return setLocalError('Please provide a valid email');
    if (password.length < 6) return setLocalError('Password must be at least 6 characters');
    if (password !== confirmPassword) return setLocalError('Passwords do not match');

    try {
      await signUp(email.trim(), password, name.trim());
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : 'Unable to create account');
    }
  };

  const onGoogleSignup = async () => {
    resetError();
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : 'Google signup failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.brand}>FinMax</Text>
            <Text style={styles.subtitle}>Create your secure finance account</Text>
          </View>

          <View style={styles.card}>
            {displayError ? (
              <View style={styles.errorBox}><Text style={styles.errorText}>{displayError}</Text></View>
            ) : null}

            <Text style={styles.label}>Full name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Akshit Jaswal"
              placeholderTextColor="#7A7A7A"
              autoCapitalize="words"
            />

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
              placeholder="Minimum 6 characters"
              placeholderTextColor="#7A7A7A"
            />

            <Text style={styles.label}>Confirm password</Text>
            <TextInput
              style={[styles.input, password === confirmPassword && password.length >= 6 ? styles.matchedInput : null]}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholder="Re-enter password"
              placeholderTextColor="#7A7A7A"
            />

            <TouchableOpacity style={styles.primaryButton} onPress={onSubmit} disabled={isLoading}>
              {isLoading ? <ActivityIndicator color={COLORS.background} /> : <Text style={styles.primaryButtonText}>Create Account</Text>}
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.googleButton} onPress={onGoogleSignup} disabled={googleLoading}>
              {googleLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.googleButtonText}>Continue with Google</Text>}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <TouchableOpacity onPress={onSwitchToLogin}>
              <Text style={styles.footerLink}>Sign in</Text>
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
  header: { marginBottom: 20, alignItems: 'center' },
  brand: { color: COLORS.text, fontSize: 34, fontWeight: '700' },
  subtitle: { color: COLORS.textSecondary, marginTop: 6 },
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 16,
  },
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
  matchedInput: { borderColor: COLORS.success },
  primaryButton: {
    marginTop: 16,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: { color: COLORS.background, fontWeight: '700' },
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
  errorBox: { backgroundColor: 'rgba(255,107,107,0.13)', borderRadius: 8, padding: 10, marginBottom: 6 },
  errorText: { color: COLORS.error, fontSize: 12 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 16, gap: 6 },
  footerText: { color: COLORS.textSecondary },
  footerLink: { color: COLORS.primary, fontWeight: '600' },
});
