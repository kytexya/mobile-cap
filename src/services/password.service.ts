import axiosClient from '../api/axiosClient';

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export const passwordService = {
  changePassword: async (payload: ChangePasswordPayload) => {
    const response = await axiosClient.post('/Password/change', {
      CurrentPassword: payload.currentPassword,
      NewPassword: payload.newPassword,
      ConfirmPassword: payload.confirmPassword,
    });
    return response.data;
  },
};
