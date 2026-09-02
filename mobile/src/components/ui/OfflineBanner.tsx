import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WifiOff } from 'lucide-react-native';
import { Colors, Spacing, FontSize, BorderRadius } from '@/theme';

interface OfflineBannerProps {
  visible: boolean;
}

export default function OfflineBanner({ visible }: OfflineBannerProps) {
  if (!visible) return null;

  return (
    <View style={styles.banner}>
      <WifiOff size={16} color={Colors.white} />
      <Text style={styles.text}>Vous êtes hors connexion</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#D97706',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  text: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: '600',
    fontFamily: 'system-ui',
  },
});
