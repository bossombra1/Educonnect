import { Platform } from 'react-native';

/**
 * Native API configuration.
 * Android emulator reaches the host machine through 10.0.2.2.
 * Physical Android/iOS devices should use the computer's LAN IP.
 */
const DEV_LAN_API_URL = 'http://192.168.1.68:3000/api';
const ANDROID_EMULATOR_API_URL = 'http://10.0.2.2:3000/api';

export const API_URL = (
  Platform.OS === 'android' ? ANDROID_EMULATOR_API_URL : DEV_LAN_API_URL
).replace(/\/$/, '');

export const APP_NAME = 'EduConnect';
