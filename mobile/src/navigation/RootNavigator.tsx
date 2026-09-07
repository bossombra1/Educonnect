import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, MessageCircle, Bell, User } from 'lucide-react-native';
import { Colors } from '@/theme';
import LoginScreen from '@/screens/native/LoginScreen';
import OtpScreen from '@/screens/native/OtpScreen';
import HomeScreen from '@/screens/native/HomeScreen';
import MessagesScreen from '@/screens/native/MessagesScreen';
import NotificationsScreen from '@/screens/native/NotificationsScreen';
import ProfileScreen from '@/screens/native/ProfileScreen';
import { UnreadProvider } from './UnreadContext';
import type { AppTabParamList, AuthStackParamList, RootStackParamList } from './types';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppTabs = createBottomTabNavigator<AppTabParamList>();

function AuthNavigator() {
  return <AuthStack.Navigator screenOptions={{ headerShown: false }}><AuthStack.Screen name="Login" component={LoginScreen} /><AuthStack.Screen name="Otp" component={OtpScreen} /></AuthStack.Navigator>;
}

function AppNavigator() {
  return <UnreadProvider><AppTabs.Navigator screenOptions={({ route }) => ({ headerShown: false, tabBarActiveTintColor: Colors.primary, tabBarInactiveTintColor: Colors.gray400, tabBarStyle: { backgroundColor: Colors.white, borderTopColor: Colors.gray100, height: 62, paddingTop: 6, paddingBottom: 8 }, tabBarIcon: ({ color, size }) => { const Icon = route.name === 'Home' ? Home : route.name === 'Messages' ? MessageCircle : route.name === 'Notifications' ? Bell : User; return <Icon size={size} color={String(color)} />; } })}>
    <AppTabs.Screen name="Home" component={HomeScreen} options={{ title: 'Accueil' }} />
    <AppTabs.Screen name="Messages" component={MessagesScreen} options={{ title: 'Messages' }} />
    <AppTabs.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
    <AppTabs.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profil' }} />
  </AppTabs.Navigator></UnreadProvider>;
}

export default function RootNavigator() { return <NavigationContainer><RootStack.Navigator screenOptions={{ headerShown: false }}><RootStack.Screen name="Auth" component={AuthNavigator} /><RootStack.Screen name="App" component={AppNavigator} /></RootStack.Navigator></NavigationContainer>; }
