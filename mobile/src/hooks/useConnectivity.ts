import { useState, useEffect } from 'react';
import { useNetInfo } from '@react-native-community/netinfo';

export function useConnectivity() {
  const netInfo = useNetInfo();
  return netInfo.isConnected ?? true;
}

export default useConnectivity;