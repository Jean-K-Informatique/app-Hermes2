import React, { Component, type ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { DEFAULT_BRANDING } from '@/constants/branding';
import { spacing, fontSize, borderRadius } from '@/constants/theme';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <Text style={styles.title}>Oups !</Text>
          <Text style={styles.message}>
            Une erreur inattendue s'est produite.
          </Text>
          <TouchableOpacity style={styles.button} onPress={this.handleRetry}>
            <Text style={styles.buttonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
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
    marginBottom: spacing.md,
  },
  message: {
    color: DEFAULT_BRANDING.textSecondary,
    fontSize: fontSize.md,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  button: {
    backgroundColor: DEFAULT_BRANDING.primaryColor,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
  },
  buttonText: {
    color: DEFAULT_BRANDING.textColor,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});
