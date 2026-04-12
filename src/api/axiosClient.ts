import axios from 'axios';
import { BASE_URL } from '../constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { useAuthStore } from '../store/authStore';

const axiosClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const getStoredToken = async () => {
  const memoryToken = useAuthStore.getState().token;
  if (memoryToken) {
    return memoryToken;
  }

  try {
    if (Platform.OS === 'web') {
      return localStorage.getItem('token');
    }
    return await SecureStore.getItemAsync('token');
  } catch (err) {
    console.warn('Failed to read token from secure store, trying localStorage:', err);
    try {
      return localStorage.getItem('token');
    } catch (localErr) {
      console.warn('Failed to read token from localStorage:', localErr);
      return null;
    }
  }
};

axiosClient.interceptors.request.use(async (config) => {
  const token = await getStoredToken();

  if (!config.headers) {
    config.headers = {} as any;
  }

  if (token) {
    if (__DEV__) {
      console.log('[axios] request', config.method?.toUpperCase(), config.url, 'token:', `${token.slice(0, 16)}...`);
    }
    config.headers.Authorization = `Bearer ${token}`;
  } else if (__DEV__) {
    console.log('[axios] request', config.method?.toUpperCase(), config.url, 'token: missing');
  }

  return config;
});

axiosClient.interceptors.response.use(
  (response) => {
    if (__DEV__) {
      console.log('[axios] response', response.config?.method?.toUpperCase(), response.config?.url, 'status:', response.status);
    }
    return response;
  },
  async (error) => {
    if (__DEV__) {
      console.log('[axios] response error', error?.config?.method?.toUpperCase(), error?.config?.url, 'status:', error?.response?.status);
    }

    if (error.response?.status === 401) {
      const { logout } = useAuthStore.getState();
      await logout();
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
