import axiosClient from '../api/axiosClient';

export interface SystemSettingItem {
  settingId: number;
  settingKey: string;
  settingValue?: string;
  description?: string;
  updatedByName?: string;
  updatedAt?: string;
}

export const systemSettingsService = {
  getAll: async () => {
    const response = await axiosClient.get('/SystemSettings');
    return response.data;
  },
};
