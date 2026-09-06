import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { getAuthItem, deleteAuthItem } from './auth-storage';

const API_URL = (Constants.expoConfig?.extra?.apiUrl ?? 'http://localhost:3000/api').replace(/\/$/, '');

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await getAuthItem('auth_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      await deleteAuthItem('auth_token');
      await deleteAuthItem('auth_user');
      await deleteAuthItem('auth_role');
      router.replace('/auth/login');
    }
    return Promise.reject(error);
  }
);

export default apiClient;
