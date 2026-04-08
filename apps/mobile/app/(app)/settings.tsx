import React from 'react';
import {
  View,
  Text,
  Switch,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { spacing, fontSize, borderRadius } from '@/constants/theme';

export default function SettingsScreen() {
  const branding = useAuthStore((s) => s.branding);
  const user = useAuthStore((s) => s.user);
  const tenant = useAuthStore((s) => s.tenant);
  const logout = useAuthStore((s) => s.logout);
  const notificationsEnabled = useSettingsStore((s) => s.notificationsEnabled);
  const setNotificationsEnabled = useSettingsStore((s) => s.setNotificationsEnabled);

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: branding.backgroundColor }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backArrow, { color: branding.primaryColor }]}>
            {'<'}
          </Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: branding.textColor }]}>
          Paramètres
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile */}
        <View style={[styles.section, { backgroundColor: branding.surfaceColor }]}>
          <View style={styles.profileRow}>
            <Avatar
              uri={user?.avatarUrl}
              name={user?.displayName}
              size={56}
            />
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: branding.textColor }]}>
                {user?.displayName || 'Utilisateur'}
              </Text>
              <Text style={[styles.profileEmail, { color: branding.textSecondary }]}>
                {user?.email}
              </Text>
              {tenant && (
                <Text style={[styles.profileTenant, { color: branding.textSecondary }]}>
                  {tenant.name}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Settings */}
        <View style={[styles.section, { backgroundColor: branding.surfaceColor }]}>
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: branding.textColor }]}>
              Notifications push
            </Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#374151', true: branding.primaryColor }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.divider, { backgroundColor: branding.backgroundColor }]} />

          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: branding.textColor }]}>
              Thème
            </Text>
            <Text style={[styles.settingValue, { color: branding.textSecondary }]}>
              Sombre
            </Text>
          </View>
        </View>

        {/* App Info */}
        <View style={[styles.section, { backgroundColor: branding.surfaceColor }]}>
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: branding.textColor }]}>
              Version
            </Text>
            <Text style={[styles.settingValue, { color: branding.textSecondary }]}>
              {appVersion}
            </Text>
          </View>
        </View>

        {/* Logout */}
        <Button
          title="Se déconnecter"
          onPress={handleLogout}
          variant="secondary"
          style={{ marginTop: spacing.lg }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backArrow: {
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  content: {
    padding: spacing.lg,
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
  },
  section: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  profileEmail: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  profileTenant: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  settingLabel: {
    fontSize: fontSize.md,
  },
  settingValue: {
    fontSize: fontSize.md,
  },
  divider: {
    height: 1,
    marginVertical: spacing.xs,
  },
});
