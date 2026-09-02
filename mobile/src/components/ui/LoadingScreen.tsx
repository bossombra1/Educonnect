import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, FontSize } from '@/theme';

export default function LoadingScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoText}>EC</Text>
        </View>
      </View>
      <Text style={styles.appName}>EduConnect</Text>
      <ActivityIndicator size="large" color={Colors.primary} style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: Spacing.lg,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    color: Colors.white,
    fontSize: FontSize['3xl'],
    fontWeight: '700',
    fontFamily: 'system-ui',
  },
  appName: {
    fontSize: FontSize['2xl'],
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: Spacing['2xl'],
    fontFamily: 'system-ui',
  },
  spinner: {
    marginTop: Spacing.lg,
  },
});
