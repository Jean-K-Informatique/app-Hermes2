import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/authStore';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { DEFAULT_BRANDING } from '@/constants/branding';
import { spacing, fontSize, borderRadius } from '@/constants/theme';

export default function LoginScreen() {
  const [tenantSlug, setTenantSlug] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  const handleLogin = async () => {
    clearError();
    try {
      await login(email.trim(), password, tenantSlug.trim());
    } catch {
      // Error is handled by the store
    }
  };

  const isFormValid = tenantSlug.trim() && email.trim() && password;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Text style={styles.logo}>H</Text>
            </View>
            <Text style={styles.title}>HermesChat</Text>
            <Text style={styles.subtitle}>
              Connectez-vous pour accéder à votre assistant
            </Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Identifiant entreprise"
              placeholder="ex: demo"
              value={tenantSlug}
              onChangeText={(t) => { clearError(); setTenantSlug(t); }}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Input
              label="Email"
              placeholder="votre@email.com"
              value={email}
              onChangeText={(t) => { clearError(); setEmail(t); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
            />
            <Input
              label="Mot de passe"
              placeholder="Votre mot de passe"
              value={password}
              onChangeText={(t) => { clearError(); setPassword(t); }}
              secureTextEntry
              autoComplete="password"
            />

            {error && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Button
              title="Se connecter"
              onPress={handleLogin}
              loading={isLoading}
              disabled={!isFormValid}
              style={{ marginTop: spacing.md }}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: DEFAULT_BRANDING.backgroundColor,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    maxWidth: 420,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: DEFAULT_BRANDING.primaryColor,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  logo: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '800',
  },
  title: {
    color: DEFAULT_BRANDING.textColor,
    fontSize: fontSize.xxl,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  subtitle: {
    color: DEFAULT_BRANDING.textSecondary,
    fontSize: fontSize.md,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    color: '#EF4444',
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
});
