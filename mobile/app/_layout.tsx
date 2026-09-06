import React, { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Slot, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Colors } from '@/theme';
import authService from '@/services/auth.service';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState<'/(tabs)' | '/auth/login'>('/auth/login');

  useEffect(() => {
    async function prepare() {
      try {
        const token = await authService.getStoredToken();
        if (!token) {
          setInitialRoute('/auth/login');
          return;
        }
        try {
          const profile = await authService.getProfile();
          setInitialRoute(profile.role === 'parent' || profile.role === 'student' || profile.role === 'staff' ? '/(tabs)' : '/auth/login');
        } catch {
          await authService.clearSession();
          setInitialRoute('/auth/login');
        }
      } catch {
        setInitialRoute('/auth/login');
      } finally {
        setIsReady(true);
      }
    }
    void prepare();
  }, []);

  useEffect(() => {
    if (isReady) void SplashScreen.hideAsync().catch(() => {});
  }, [isReady]);

  useEffect(() => {
    if (isReady) router.replace(initialRoute);
  }, [isReady, initialRoute]);

  if (!isReady) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Slot />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' },
});
