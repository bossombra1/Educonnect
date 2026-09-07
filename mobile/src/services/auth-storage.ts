import * as Keychain from 'react-native-keychain';

const SERVICE_NAME = 'com.educonnect.mobile.auth';

export async function getAuthItem(key: string): Promise<string | null> {
  try {
    const credentials = await Keychain.getGenericPassword({ service: `${SERVICE_NAME}.${key}` });
    return credentials ? credentials.password : null;
  } catch {
    return null;
  }
}

export async function setAuthItem(key: string, value: string): Promise<void> {
  await Keychain.setGenericPassword(key, value, {
    service: `${SERVICE_NAME}.${key}`,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function deleteAuthItem(key: string): Promise<void> {
  await Keychain.resetGenericPassword({ service: `${SERVICE_NAME}.${key}` });
}
