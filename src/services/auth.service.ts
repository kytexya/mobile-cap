import axiosClient from '../api/axiosClient';

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    user: {
      userId: number;
      username: string;
      role: 'Teacher' | 'Parent' | 'Admin';
      fullName?: string;
    };
  };
}

export const authService = {
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const response = await axiosClient.post('/auth/login', { username, password });
    return response.data;
  },
  getProfile: async () => {
    const response = await axiosClient.get('/auth/profile');
    return response.data;
  },
};
