import axiosClient from '../api/axiosClient';
import { extractArray, extractObject } from '../utils/normalization';

export interface Invoice {
  id: number;
  studentId: number;
  monthYear: string;
  amount: number;
  status: 'Paid' | 'Unpaid' | 'Pending';
  dueDate: string;
  items: Array<{ name: string; cost: number }>;
}

export const invoiceService = {
  getByStudentId: async (studentId: number) => {
    const response = await axiosClient.get(`/Invoice/student/${studentId}`);
    return extractArray<Invoice>(response.data);
  },
  getById: async (id: number) => {
    const response = await axiosClient.get(`/Invoice/${id}`);
    return extractObject<Invoice>(response.data);
  },
  pay: async (id: number, paymentMethod: string) => {
    const response = await axiosClient.post(`/Invoice/${id}/pay`, { paymentMethod });
    return response.data;
  },
};
