import type { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Login: undefined;
  Otp: {
    phone: string;
    role: 'parent' | 'student' | 'staff';
    matricule?: string;
    childMatricule?: string;
  };
};

export type AppTabParamList = {
  Home: undefined;
  Messages: undefined;
  Notifications: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList> | undefined;
  App: NavigatorScreenParams<AppTabParamList> | undefined;
};
