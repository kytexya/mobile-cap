import axiosClient from '../api/axiosClient';

export interface Notification {
  id: number;
  userId: number;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
}

export const notificationService = {
  getMyNotifications: async () => {
    const response = await axiosClient.get('/Notification');
    return response.data;
  },
  markAsRead: async (id: number) => {
    const response = await axiosClient.patch(`/Notification/${id}/read`);
    return response.data;
  },
  delete: async (id: number) => {
    const response = await axiosClient.delete(`/Notification/${id}`);
    return response.data;
  },
};
