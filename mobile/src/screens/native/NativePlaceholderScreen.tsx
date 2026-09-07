import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, FontSize, Spacing } from '@/theme';

type Props = { title: string };

export default function NativePlaceholderScreen({ title }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>
        Écran temporaire de la migration Expo vers React Native natif.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    padding: Spacing['2xl'],
  },
  title: {
    color: Colors.gray900,
    fontSize: FontSize.xl,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: Spacing.md,
    color: Colors.gray500,
    fontSize: FontSize.sm,
    textAlign: 'center',
  },
});
