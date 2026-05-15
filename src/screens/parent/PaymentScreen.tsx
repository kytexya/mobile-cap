import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Building2, Check, CreditCard, Globe, Smartphone, Wallet } from 'lucide-react-native';
import { invoiceService } from '../../services/invoice.service';

interface PaymentScreenProps {
  navigation?: any;
  route?: {
    params?: {
      billId?: number;
      amount?: number;
      month?: string;
    };
  };
}

type PaymentMethod = 'bank' | 'momo' | 'zalopay' | 'vnpay';

const PAYMENT_METHODS = [
  {
    id: 'vnpay' as const,
    name: 'VNPAY',
    subtitle: 'Thanh toán qua cổng VNPAY (ATM/Visa/Master)',
    icon: <Globe size={24} color="#1A1F36" />,
  },
  {
    id: 'bank' as const,
    name: 'Chuyển khoản ngân hàng',
    subtitle: 'Chuyển khoản qua ngân hàng nội địa',
    icon: <Building2 size={24} color="#1A1F36" />,
  },
  {
    id: 'momo' as const,
    name: 'Ví MoMo',
    subtitle: 'Thanh toán qua ví điện tử MoMo',
    icon: <Smartphone size={24} color="#D82D8B" />,
  },
  {
    id: 'zalopay' as const,
    name: 'ZaloPay',
    subtitle: 'Thanh toán qua ví ZaloPay',
    icon: <Wallet size={24} color="#008FE5" />,
  },
];

const formatMoney = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);

const PaymentScreen: React.FC<PaymentScreenProps> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('vnpay');
  const [loading, setLoading] = useState(false);

  const billId = route?.params?.billId ?? 0;
  const amount = route?.params?.amount ?? 0;
  const month = route?.params?.month ?? '';

  const getVnpayReturnUrl = () => {
    const query = new URLSearchParams({
      amount: String(amount),
      month,
      billId: String(billId),
    }).toString();

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return `${window.location.origin}/payment/vnpay-return?${query}`;
    }

    // For mobile, use deep linking scheme
    return `kmsmobile://payment/vnpay-return?${query}`;
  };

  const parseVnpayReturn = (url: string) => {
    const query = url.split('?')[1] || '';
    const params = new URLSearchParams(query);
    const rawAmount = Number(params.get('amount') ?? params.get('vnp_Amount') ?? amount);
    return {
      responseCode: params.get('vnp_ResponseCode'),
      transactionStatus: params.get('vnp_TransactionStatus'),
      transactionId: params.get('vnp_TxnRef') || `VNP${Date.now()}`,
      amount: params.get('vnp_Amount') ? rawAmount / 100 : rawAmount,
      month: params.get('month') ?? month,
    };
  };

  const navigateFromVnpayReturn = (url: string) => {
    if (!url.includes('vnp_ResponseCode')) return;
    const result = parseVnpayReturn(url);
    const success = result.responseCode === '00' && result.transactionStatus === '00';

    navigation?.replace?.(success ? 'PaymentSuccess' : 'PaymentFailed', {
      amount: result.amount,
      month: result.month,
      transactionId: result.transactionId,
      paymentMethod: 'vnpay',
      errorCode: result.responseCode || '99',
      errorMessage: result.responseCode === '24' ? 'Bạn đã hủy thanh toán' : 'Thanh toán không thành công',
    });
  };

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      // Check if we're returning from VNPAY payment
      const url = window.location.href;
      if (url.includes('payment/vnpay-return') || url.includes('vnp_ResponseCode')) {
        navigateFromVnpayReturn(url);
      } else {
        // Check for interrupted payment session
        const pendingPayment = sessionStorage.getItem('pendingPayment');
        if (pendingPayment) {
          const paymentData = JSON.parse(pendingPayment);
          const timeDiff = Date.now() - paymentData.timestamp;
          // If more than 30 minutes have passed, clear the session
          if (timeDiff > 30 * 60 * 1000) {
            sessionStorage.removeItem('pendingPayment');
          }
        }
      }
    }
  }, []);

  const handleConfirmPayment = async () => {
    if (!billId || amount <= 0) return;

    if (selectedMethod === 'vnpay') {
      setLoading(true);
      try {
        const response = await invoiceService.pay(billId, 'VNPay', {
          returnUrl: getVnpayReturnUrl(),
        });
        const paymentUrl = response?.paymentUrl || response?.data?.paymentUrl || response?.url || response?.data?.url;

        if (!paymentUrl) {
          alert('Không thể tạo link thanh toán VNPAY. Vui lòng thử lại.');
          return;
        }

        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          sessionStorage.setItem('pendingPayment', JSON.stringify({ billId, amount, month, timestamp: Date.now() }));
          window.location.assign(paymentUrl);
        } else {
          await Linking.openURL(paymentUrl);
        }
      } catch (err) {
        console.error('VNPAY error:', err);
        alert('Có lỗi xảy ra khi tạo link thanh toán.');
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      const response = await invoiceService.pay(billId, selectedMethod);
      if (response?.success || response?.data || response?.transactionId) {
        navigation?.navigate?.('PaymentSuccess', {
          amount,
          month,
          transactionId: response?.transactionId || response?.data?.transactionId || `TXN${Date.now()}`,
          paymentMethod: selectedMethod,
        });
      } else {
        alert('Thanh toán thất bại. Vui lòng thử lại sau.');
      }
    } catch (err) {
      console.error('Payment error:', err);
      alert('Có lỗi xảy ra khi thanh toán. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Pressable onPress={() => navigation?.goBack?.()} style={styles.backButton}>
            <ArrowLeft size={24} color="#FFFFFF" strokeWidth={2} />
          </Pressable>
          <Text style={styles.headerTitle}>Thanh toán học phí</Text>
          <View style={styles.headerSpacer} />
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Thông tin hóa đơn</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Kỳ thanh toán</Text>
            <Text style={styles.summaryValue}>{month || '---'}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Mã hóa đơn</Text>
            <Text style={styles.summaryValue}>#{billId}</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Tổng thanh toán</Text>
            <Text style={styles.totalValue}>{formatMoney(amount)}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Chọn phương thức thanh toán</Text>
        <View style={styles.methodsContainer}>
          {PAYMENT_METHODS.map((method) => (
            <Pressable
              key={method.id}
              onPress={() => setSelectedMethod(method.id)}
              style={[styles.methodCard, selectedMethod === method.id && styles.methodCardSelected]}
            >
              <View style={styles.methodIcon}>{method.icon}</View>
              <View style={styles.methodInfo}>
                <Text style={styles.methodName}>{method.name}</Text>
                <Text style={styles.methodSubtitle}>{method.subtitle}</Text>
              </View>
              <View style={[styles.radioCircle, selectedMethod === method.id && styles.radioCircleSelected]}>
                {selectedMethod === method.id && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
              </View>
            </Pressable>
          ))}
        </View>

        <View style={styles.securityNote}>
          <CreditCard size={16} color="#6B7280" />
          <Text style={styles.securityText}>
            Thanh toán được bảo mật bởi hệ thống KMS. Thông tin thẻ không được lưu trữ.
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.bottomContainer, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable
          onPress={handleConfirmPayment}
          disabled={loading || !billId}
          style={[styles.confirmButton, (loading || !billId) && styles.confirmButtonDisabled]}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.confirmButtonText}>Xác nhận & Thanh toán {formatMoney(amount)}</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#1A1F36' },
  header: {
    backgroundColor: '#1A1F36',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingTop: 12,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { padding: 8, marginLeft: -8 },
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold', lineHeight: 24 },
  headerSpacer: { width: 40 },
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  content: { padding: 16, gap: 20 },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryTitle: { fontSize: 16, fontWeight: 'bold', color: '#1F2937', marginBottom: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  summaryLabel: { fontSize: 14, color: '#6B7280' },
  summaryValue: { fontSize: 14, color: '#1F2937', fontWeight: '500' },
  totalRow: { borderTopWidth: 1, borderTopColor: '#E5E7EB', marginTop: 8, paddingTop: 12 },
  totalLabel: { fontSize: 16, fontWeight: 'bold', color: '#1F2937' },
  totalValue: { fontSize: 18, fontWeight: 'bold', color: '#1A1F36' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1F2937', marginBottom: 4 },
  methodsContainer: { gap: 12 },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  methodCardSelected: { borderColor: '#1A1F36', backgroundColor: '#FAFBFC' },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  methodInfo: { flex: 1 },
  methodName: { fontSize: 15, fontWeight: '600', color: '#1F2937', marginBottom: 2 },
  methodSubtitle: { fontSize: 13, color: '#6B7280' },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: { backgroundColor: '#1A1F36', borderColor: '#1A1F36' },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  securityText: { flex: 1, fontSize: 12, color: '#6B7280', lineHeight: 18 },
  bottomContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  confirmButton: {
    backgroundColor: '#1A1F36',
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonDisabled: { backgroundColor: '#9CA3AF' },
  confirmButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
});

export default PaymentScreen;
