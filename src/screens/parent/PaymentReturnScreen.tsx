import React, { useEffect } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { invoiceService } from '../../services/invoice.service';

const getParam = (params: any, key: string) => {
  const value = params?.[key];
  return Array.isArray(value) ? value[0] : value;
};

const PaymentReturnScreen = ({ navigation, route }: any) => {
  useEffect(() => {
    const finishPayment = async () => {
      const params = route?.params ?? {};
      const responseCode = getParam(params, 'vnp_ResponseCode');
      const transactionStatus = getParam(params, 'vnp_TransactionStatus');
      const transactionId = getParam(params, 'vnp_TxnRef') || `VNP${Date.now()}`;
      const rawAmount = Number(getParam(params, 'amount') ?? getParam(params, 'vnp_Amount') ?? 0);
      const amount = getParam(params, 'vnp_Amount') ? rawAmount / 100 : rawAmount;
      const month = getParam(params, 'month') ?? '';
      let isSuccess = responseCode === '00' && transactionStatus === '00';
      let errorMessage = responseCode === '24' ? 'Bạn đã hủy thanh toán' : 'Thanh toán không thành công';

      try {
        const queryString = new URLSearchParams(params as Record<string, string>).toString();
        console.log('[PaymentReturn] Processing VNPAY return with query:', queryString);

        const backendResult = await invoiceService.processVNPAYReturn(queryString);
        console.log('[PaymentReturn] Backend result:', backendResult);

        isSuccess = Boolean(backendResult?.success);
        errorMessage = backendResult?.message || backendResult?.data?.message || errorMessage;

        // If backend returns success but we have a response code, verify it matches
        if (isSuccess && responseCode && responseCode !== '00') {
          isSuccess = false;
          errorMessage = `Payment failed with code ${responseCode}`;
        }
      } catch (error: any) {
        console.error('[PaymentReturn] Error processing VNPAY return:', error);

        // Fallback: Use response code to determine success if backend call fails
        if (responseCode) {
          isSuccess = responseCode === '00';
          if (responseCode === '24') {
            errorMessage = 'Bạn đã hủy thanh toán';
          } else if (responseCode === '00') {
            errorMessage = 'Thanh toán thành công';
          } else {
            errorMessage = `Thanh toán không thành công (Mã lỗi: ${responseCode})`;
          }
        } else {
          isSuccess = false;

          // Handle different error types
          if (error?.response?.status === 400) {
            errorMessage = error?.response?.data?.message || 'Invalid payment parameters';
          } else if (error?.response?.status === 404) {
            errorMessage = 'Payment service not available';
          } else {
            errorMessage = error?.response?.data?.message || error?.message || errorMessage;
          }
        }
      }

      navigation.replace(isSuccess ? 'PaymentSuccess' : 'PaymentFailed', {
        amount,
        month,
        transactionId,
        paymentMethod: 'vnpay',
        errorCode: responseCode || '99',
        errorMessage,
      });
    };

    finishPayment();
  }, [navigation, route?.params]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.title}>Đang xác nhận thanh toán...</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F7FB' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  title: { color: '#475467', fontSize: 14, fontWeight: '700' },
});

export default PaymentReturnScreen;
