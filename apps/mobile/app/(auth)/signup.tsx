import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { colors, spacing, borderRadius, typography, shadows } from '../../theme/theme';
import { useThemeColors } from '../../theme/theme';

export default function SignupScreen() {
  const router = useRouter();
  const themeColors = useThemeColors();
  const { signup, isSigningUp } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSignup = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters.');
      return;
    }

    try {
      await signup({ email: email.trim(), password, displayName: displayName.trim() || undefined });
      router.replace('/(tabs)/');
    } catch (err) {
      Alert.alert('Sign Up Failed', (err as Error).message ?? 'Please try again.');
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: themeColors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: themeColors.text }]}>Create account</Text>
            <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
              Start saving and organizing your videos.
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: themeColors.surface }, shadows.md]}>
            <View style={styles.field}>
              <Text style={[styles.label, { color: themeColors.textSecondary }]}>
                Name <Text style={styles.optional}>(optional)</Text>
              </Text>
              <TextInput
                style={[styles.input, { color: themeColors.text, borderColor: themeColors.border, backgroundColor: themeColors.background }]}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Your name"
                placeholderTextColor={themeColors.textSecondary}
                autoComplete="name"
                autoCorrect={false}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: themeColors.textSecondary }]}>Email</Text>
              <TextInput
                style={[styles.input, { color: themeColors.text, borderColor: themeColors.border, backgroundColor: themeColors.background }]}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={themeColors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: themeColors.textSecondary }]}>Password</Text>
              <View style={styles.passwordWrapper}>
                <TextInput
                  style={[styles.input, styles.passwordInput, { color: themeColors.text, borderColor: themeColors.border, backgroundColor: themeColors.background }]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Min. 8 characters"
                  placeholderTextColor={themeColors.textSecondary}
                  secureTextEntry={!showPassword}
                  autoComplete="new-password"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword((v) => !v)}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={themeColors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.signupButton, isSigningUp && styles.buttonDisabled]}
              onPress={handleSignup}
              disabled={isSigningUp}
              activeOpacity={0.85}
            >
              {isSigningUp ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.signupButtonText}>Create Account</Text>
              )}
            </TouchableOpacity>

            <Text style={[styles.loginText, { color: themeColors.textSecondary }]}>
              Already have an account?{' '}
              <Link href="/(auth)/login" style={styles.loginLink}>
                Sign in
              </Link>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  keyboardView: { flex: 1 },
  container: {
    flexGrow: 1,
    padding: spacing.lg,
    justifyContent: 'center',
    gap: spacing.lg,
  },
  header: {
    gap: spacing.xs,
  },
  title: {
    ...typography.h1,
  },
  subtitle: {
    ...typography.body,
  },
  card: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  field: { gap: spacing.xs },
  label: { ...typography.caption, fontWeight: '500' },
  optional: { fontWeight: '400', fontStyle: 'italic' },
  input: {
    borderWidth: 1.5,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    ...typography.body,
  },
  passwordWrapper: { position: 'relative' },
  passwordInput: { paddingRight: 44 },
  eyeButton: {
    position: 'absolute',
    right: spacing.md,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  signupButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm + 4,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  buttonDisabled: { opacity: 0.6 },
  signupButtonText: {
    ...typography.bodyMedium,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  loginText: {
    ...typography.body,
    textAlign: 'center',
  },
  loginLink: {
    color: colors.primary,
    fontWeight: '600',
  },
});
