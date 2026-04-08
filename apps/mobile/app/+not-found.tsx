import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Link, Stack } from 'expo-router';
import { DEFAULT_BRANDING } from '@/constants/branding';
import { spacing, fontSize } from '@/constants/theme';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Page introuvable' }} />
      <View style={styles.container}>
        <Text style={styles.title}>Page introuvable</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Retour à l'accueil</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DEFAULT_BRANDING.backgroundColor,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  title: {
    color: DEFAULT_BRANDING.textColor,
    fontSize: fontSize.xxl,
    fontWeight: '700',
    marginBottom: spacing.lg,
  },
  link: {
    marginTop: spacing.md,
  },
  linkText: {
    color: DEFAULT_BRANDING.primaryColor,
    fontSize: fontSize.md,
  },
});
