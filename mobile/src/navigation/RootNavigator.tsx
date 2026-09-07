import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, MessageCircle, Bell, User } from 'lucide-react-native';
import { Colors } from '@/theme';
import authService from '@/services/auth.service';
import LoginScreen from '@/screens/auth/LoginScreen';
import OtpScreen from '@/screens/auth/OtpScreen';
import NativePlaceholderScreen from '@/screens/native/NativePlaceholderScreen';
import type { AppTabParamList, AuthStackParamList, RootStackParamList } from './types';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppTabs = createBottomTabNavigator<AppTabParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Otp" component={OtpScreen} />
    </AuthStack.Navigator>
  );
}

function AppNavigator() {
  return (
    <AppTabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.gray400,
        tabBarStyle: { backgroundColor: Colors.white, borderTopColor: Colors.gray100, height: 62, paddingTop: 6, paddingBottom: 8 },
        tabBarIcon: ({ color, size }) => {
          const Icon = route.name === 'Home' ? Home : route.name === 'Messages' ? MessageCircle : route.name === 'Notifications' ? Bell : User;
          return <Icon size={size} color={String(color)} />;
        },
      })}
    >
      <AppTabs.Screen name="Home" options={{ title: 'Accueil' }}>{() => <NativePlaceholderScreen title="Accueil" />}</AppTabs.Screen>
      <AppTabs.Screen name="Messages" options={{ title: 'Messages' }}>{() => <NativePlaceholderScreen title="Messages" />}</AppTabs.Screen>
      <AppTabs.Screen name="Notifications" options={{ title: 'Notifications' }}>{() => <NativePlaceholderScreen title="Notifications" />}</AppTabs.Screen>
      <AppTabs.Screen name="Profile" options={{ title: 'Profil' }}>{() => <NativePlaceholderScreen title="Profil" />}</AppTabs.Screen>
    </AppTabs.Navigator>
  );
}

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="Auth" component={AuthNavigator} />
        <RootStack.Screen name="App" component={AppNavigator} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
