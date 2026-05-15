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
  pay: async (id: number, paymentMethod: string, options?: { returnUrl?: string }) => {
    if (paymentMethod.toLowerCase() === 'vnpay') {
      // Use VNPAY specific endpoint for creating payment URL
      const payload = {
        invoiceId: id,
        orderInfo: 'Thanh toan hoc phi',
        bankCode: '',
        returnUrl: options?.returnUrl,
      };
      const response = await axiosClient.post('/VNPay/create-payment', payload);
      return response.data;
    } else {
      // Use general payment endpoint for other methods
      const payload = {
        invoiceId: id,
        paymentMethod,
        orderInfo: 'Thanh toan hoc phi',
        bankCode: ''
      };
      const response = await axiosClient.post('/Payment', payload);
      return response.data;
    }
  },

  // Check VNPAY payment status
  checkVNPAYStatus: async (transactionId: string) => {
    try {
      const response = await axiosClient.get(`/VNPay/return-json?vnp_TxnRef=${transactionId}`);
      return response.data;
    } catch (error) {
      console.error('Error checking VNPAY status:', error);
      return null;
    }
  },

  processVNPAYReturn: async (queryString: string) => {
    const query = queryString.startsWith('?') ? queryString.slice(1) : queryString;
    const response = await axiosClient.get(`/VNPay/return-json?${query}`);
    return response.data;
  },
};
