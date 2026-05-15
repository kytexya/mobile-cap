import React from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle2, Receipt, Calendar, CreditCard, ArrowLeft } from 'lucide-react-native';

interface PaymentSuccessScreenProps {
  navigation?: any;
  route?: {
    params?: {
      amount?: number;
      month?: string;
      transactionId?: string;
      paymentMethod?: string;
    };
  };
}

const PaymentSuccessScreen: React.FC<PaymentSuccessScreenProps> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();

  const amount = route?.params?.amount ?? 0;
  const month = route?.params?.month ?? '';
  const transactionId = route?.params?.transactionId ?? '';
  const paymentMethod = route?.params?.paymentMethod ?? 'bank';

  const formatMoney = (value: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = () => {
    return new Date().toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPaymentMethodName = (method: string) => {
    const names: Record<string, string> = {
      bank: 'Chuyển khoản ngân hàng',
      momo: 'Ví MoMo',
      zalopay: 'ZaloPay',
    };
    return names[method] || method;
  };

  const handleBackToTuition = () => {
    navigation?.navigate?.('Tuition');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Pressable onPress={handleBackToTuition} style={styles.backButton}>
            <ArrowLeft size={24} color="#FFFFFF" strokeWidth={2} />
          </Pressable>
          <Text style={styles.headerTitle}>Thanh toán thành công</Text>
          <View style={styles.headerSpacer} />
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Success Icon */}
        <View style={styles.successSection}>
          <View style={styles.successIconContainer}>
            <CheckCircle2 size={64} color="#FFFFFF" strokeWidth={2} />
          </View>
          <Text style={styles.successTitle}>Thanh toán thành công!</Text>
          <Text style={styles.successSubtitle}>
            Giao dịch của bạn đã được xử lý thành công
          </Text>
        </View>

        {/* Transaction Details Card */}
        <View style={styles.detailsCard}>
          <Text style={styles.detailsTitle}>Chi tiết giao dịch</Text>
          
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Receipt size={18} color="#4F46E5" />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Mã giao dịch</Text>
              <Text style={styles.detailValue} numberOfLines={1}>
                {transactionId}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Calendar size={18} color="#4F46E5" />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Thời gian</Text>
              <Text style={styles.detailValue}>{formatDate()}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <CreditCard size={18} color="#4F46E5" />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Phương thức</Text>
              <Text style={styles.detailValue}>{getPaymentMethodName(paymentMethod)}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.amountSection}>
            <Text style={styles.amountLabel}>Số tiền đã thanh toán</Text>
            <Text style={styles.amountValue}>{formatMoney(amount)}</Text>
            <Text style={styles.monthLabel}>Kỳ: {month}</Text>
          </View>
        </View>

        {/* Success Badge */}
        <View style={styles.badgeContainer}>
          <View style={styles.successBadge}>
            <CheckCircle2 size={16} color="#FFFFFF" />
            <Text style={styles.badgeText}>Đã thanh toán</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action */}
      <View style={[styles.bottomContainer, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable onPress={handleBackToTuition} style={styles.backButtonLarge}>
          <Text style={styles.backButtonText}>Quay lại trang học phí</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1A1F36',
  },
  header: {
    backgroundColor: '#1A1F36',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingTop: 12,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    lineHeight: 24,
  },
  headerSpacer: {
    width: 40,
  },
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  content: {
    padding: 16,
    gap: 20,
  },
  successSection: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 10,
  },
  successIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  detailIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 14,
  },
  amountSection: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  amountLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  amountValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1F36',
    marginBottom: 8,
  },
  monthLabel: {
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: '500',
  },
  badgeContainer: {
    alignItems: 'center',
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22C55E',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  bottomContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  backButtonLarge: {
    backgroundColor: '#1A1F36',
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default PaymentSuccessScreen;
