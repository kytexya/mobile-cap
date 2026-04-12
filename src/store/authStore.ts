import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { extractUserRole } from '../utils/auth';
import { authService } from '../services/auth.service';
import { extractObject } from '../utils/normalization';

interface User {
  id: number;
  username: string;
  role: 'Teacher' | 'Parent' | 'Admin';
  fullName?: string;
  email?: string;
  phone?: string;
  classId?: number;
  className?: string;
  teacherId?: number;
  studentId?: number;
  [key: string]: any;
}

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => Promise<void>;
  updateUser: (partialUser: Partial<User>) => Promise<void>;
  logout: () => Promise<void>;
  loadAuth: () => Promise<void>;
  syncProfile: () => Promise<void>;
}

const isWeb = Platform.OS === 'web';

const setItem = async (key: string, value: string) => {
  try {
    if (isWeb) {
      localStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  } catch (err) {
    console.warn(`Failed to set ${key} in secure storage, using localStorage:`, err);
    try {
      localStorage.setItem(key, value);
    } catch (localErr) {
      console.error(`Failed to set ${key} in localStorage:`, localErr);
    }
  }
};

const getItem = async (key: string) => {
  try {
    if (isWeb) {
      return localStorage.getItem(key);
    }
    return await SecureStore.getItemAsync(key);
  } catch (err) {
    console.warn(`Failed to get ${key} from secure storage, trying localStorage:`, err);
    try {
      return localStorage.getItem(key);
    } catch (localErr) {
      console.error(`Failed to get ${key} from localStorage:`, localErr);
      return null;
    }
  }
};

const removeItem = async (key: string) => {
  try {
    if (isWeb) {
      localStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  } catch (err) {
    console.warn(`Failed to delete ${key} from secure storage, trying localStorage:`, err);
    try {
      localStorage.removeItem(key);
    } catch (localErr) {
      console.error(`Failed to delete ${key} from localStorage:`, localErr);
    }
  }
};

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  setAuth: async (token, user) => {
    try {
      await setItem('token', token);
      await setItem('user', JSON.stringify(user));
      set({ token, user });
    } catch (e) {
      console.error('Failed to save auth to storage', e);
    }
  },
  updateUser: async (partialUser) => {
    try {
      set((state) => {
        if (!state.user) return state;
        const updatedUser = { ...state.user, ...partialUser };
        setItem('user', JSON.stringify(updatedUser)).catch(console.error);
        return { user: updatedUser };
      });
    } catch (e) {
      console.error('Failed to update user in storage', e);
    }
  },
  logout: async () => {
    try {
      await removeItem('token');
      await removeItem('user');
      set({ token: null, user: null });
    } catch (e) {
      console.error('Failed to clear storage', e);
    }
  },
  loadAuth: async () => {
    try {
      const token = await getItem('token');
      const userStr = await getItem('user');
      let user = userStr ? JSON.parse(userStr) : null;

      if (user && user.role) {
        user.role = extractUserRole(user);
      }

      set({ token, user });
    } catch (e) {
      console.error('Failed to load auth from storage', e);
    }
  },
  syncProfile: async () => {
    const { token, user, updateUser } = useAuthStore.getState();
    if (!token || !user) return;

    try {
      if (__DEV__) console.log('[authStore] Syncing profile...');
      const response = await authService.getProfile();
      const profile = extractObject<any>(response);
      if (profile) {
        if (__DEV__) console.log('[authStore] Profile synced success');
        const updatedRole = extractUserRole(profile);
        await updateUser({ ...profile, role: updatedRole });
      }
    } catch (err) {
      if (__DEV__) console.warn('[authStore] Profile sync failed', err);
    }
  },
}));

// Functional helpers for axios
export const getAuthToken = async () => getItem('token');
export const removeAuthToken = async () => removeItem('token');
