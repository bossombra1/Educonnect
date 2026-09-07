import { Platform } from 'react-native';
const DEV_LAN_API_URL='http://192.168.1.68:3000/api';
const ANDROID_EMULATOR_API_URL='http://10.0.2.2:3000/api';
const model=String(Platform.constants?.Model??'').toLowerCase();
const isAndroidEmulator=Platform.OS==='android'&&(model.includes('sdk')||model.includes('emulator')||model.includes('google_sdk')||model.includes('simulator'));
export const API_URL=(isAndroidEmulator?ANDROID_EMULATOR_API_URL:DEV_LAN_API_URL).replace(/\/$/,'');
export const APP_NAME='EduConnect';
