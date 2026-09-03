import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import toast from 'react-hot-toast';

const apiClient = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  __educonnectRetried?: boolean;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryableRequestConfig | undefined;
    const method = config?.method?.toLowerCase();

    // A transient GET failure should not leave list/statistics pages in a false
    // "empty" state. Retry once before surfacing the final error to the UI.
    if (
      config &&
      !config.__educonnectRetried &&
      method &&
      ['get', 'head', 'options'].includes(method)
    ) {
      config.__educonnectRetried = true;
      return apiClient(config);
    }

    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }

    const message =
      error.response?.data && typeof error.response.data === 'object'
        ? ((error.response.data as { error?: string; message?: string }).error ||
          (error.response.data as { error?: string; message?: string }).message)
        : undefined;

    toast.error(message || 'Impossible de communiquer avec le serveur. Veuillez réessayer.');
    return Promise.reject(error);
  }
);

export default apiClient;
