import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import toast from 'react-hot-toast';

const API_ERROR_EVENT = 'educonnect:api-error';

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

    // Retry read-only requests once so transient failures do not become false empty states.
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
    const finalMessage = message || 'Impossible de communiquer avec le serveur. Veuillez réessayer.';

    toast.error(finalMessage);
    window.dispatchEvent(new CustomEvent(API_ERROR_EVENT, { detail: { message: finalMessage } }));
    return Promise.reject(error);
  }
);

export default apiClient;
